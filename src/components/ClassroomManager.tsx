import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  ClipboardList,
  Copy,
  FileText,
  GraduationCap,
  Plus,
  Send,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { EducationMode } from '../types/education'

interface ClassroomSettings {
  max_students: number
  allow_collaboration: boolean
  share_results: boolean
  template_access: string
  require_approval: boolean
  custom_templates_only?: boolean
  lti_context_id?: string
}

interface Classroom {
  id: string
  name: string
  description: string
  join_code: string
  owner_id: string
  settings: ClassroomSettings
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
  member_count?: number
}

type ClassroomRole = 'instructor' | 'ta' | 'student' | 'observer'

interface ClassroomMember {
  id: string
  user_id: string
  role: ClassroomRole
  joined_at: string
  last_active_at: string
}

interface Assignment {
  id: string
  title: string
  description: string
  template_id: string
  custom_scenario?: Record<string, unknown> | null
  due_date: string | null
  points_possible: number
  is_published: boolean
  created_at: string
  submission_count?: number
}

interface AssignmentSubmission {
  id: string
  assignment_id: string
  student_id: string
  analysis_run_id: string | null
  explanation: string | null
  score: number | null
  feedback: string | null
  graded_by: string | null
  graded_at: string | null
  submitted_at: string
}

interface ClassroomActivity {
  id: string
  classroom_id: string
  user_id: string | null
  activity_type: string
  metadata: Record<string, unknown> | null
  created_at: string
}

interface TemplateOption {
  id: string
  title: string
  category: string
  description: string
  scenarioText: string
}

interface ClassroomManagerProps {
  userId: string
  educationMode?: EducationMode
}

const CLASSROOM_TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: 'market-entry',
    title: 'Market Entry Response',
    category: 'Business',
    description: 'Sequential response to a challenger entering an established market.',
    scenarioText: 'A challenger is deciding whether to enter a market while the incumbent chooses whether to accommodate or retaliate.'
  },
  {
    id: 'trade-war',
    title: 'Tariff Escalation Drill',
    category: 'Geopolitical',
    description: 'Map retaliatory trade actions and second-order effects.',
    scenarioText: 'Two major economies are escalating tariffs and must decide whether to retaliate, pause, or negotiate.'
  },
  {
    id: 'vendor-renewal',
    title: 'Vendor Renewal Under Pressure',
    category: 'Negotiation',
    description: 'Practice negotiating a supplier renewal after a price increase.',
    scenarioText: 'A critical vendor opened a renewal with a double-digit price increase while the buyer has limited outside options.'
  },
  {
    id: 'supply-allocation',
    title: 'Constrained Supply Allocation',
    category: 'Commodity',
    description: 'Model how buyers and suppliers allocate scarce supply during volatility.',
    scenarioText: 'A supplier is rationing scarce supply and the buyer must trade volume, timing, and commitment to secure allocation.'
  },
  {
    id: 'regulatory-escalation',
    title: 'Regulatory Escalation Sequence',
    category: 'Policy',
    description: 'Sequence countermoves in a live regulatory dispute.',
    scenarioText: 'A regulator is signaling intervention and the firm must choose whether to comply, litigate, or negotiate.'
  },
  {
    id: 'sequential-bargaining',
    title: 'Sequential Bargaining Lab',
    category: 'Game Theory',
    description: 'Track offers, counteroffers, and outside options in a structured bargaining flow.',
    scenarioText: 'Two actors alternate offers while each side updates beliefs about patience, leverage, and outside options.'
  }
]

const DEFAULT_ASSIGNMENT_FORM = {
  title: '',
  description: '',
  template_id: CLASSROOM_TEMPLATE_OPTIONS[0].id,
  due_date: '',
  points_possible: 100,
  is_published: false
}

const formatDate = (value?: string | null) => {
  if (!value) return 'No date set'
  return new Date(value).toLocaleString()
}

const getActivityLabel = (activity: ClassroomActivity) => {
  switch (activity.activity_type) {
    case 'join':
      return 'Joined classroom'
    case 'assignment_create':
      return 'Created assignment'
    case 'assignment_publish':
      return 'Published assignment'
    case 'assignment_unpublish':
      return 'Moved assignment back to draft'
    case 'submit':
      return 'Submitted assignment'
    case 'grade':
      return 'Graded submission'
    default:
      return activity.activity_type.replace(/_/g, ' ')
  }
}

const ClassroomManager: React.FC<ClassroomManagerProps> = ({ userId, educationMode = 'classroom' }) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  const [members, setMembers] = useState<ClassroomMember[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([])
  const [activities, setActivities] = useState<ClassroomActivity[]>([])
  const [viewerRole, setViewerRole] = useState<ClassroomRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<'list' | 'detail' | 'create' | 'join'>('list')
  const [joinCode, setJoinCode] = useState('')
  const [copiedCode, setCopiedCode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAssignmentComposer, setShowAssignmentComposer] = useState(false)

  const [newClassroom, setNewClassroom] = useState({
    name: '',
    description: '',
    max_students: 50,
    allow_collaboration: true,
    share_results: false,
    starts_at: '',
    ends_at: ''
  })
  const [newAssignment, setNewAssignment] = useState(DEFAULT_ASSIGNMENT_FORM)
  const [submissionDrafts, setSubmissionDrafts] = useState<Record<string, { explanation: string; analysis_run_id: string }>>({})
  const [gradingDrafts, setGradingDrafts] = useState<Record<string, { score: string; feedback: string }>>({})

  const templateById = useMemo(() => {
    return new Map(CLASSROOM_TEMPLATE_OPTIONS.map((template) => [template.id, template]))
  }, [])

  const isOwner = selectedClassroom?.owner_id === userId
  const canManageClassroom = isOwner || viewerRole === 'instructor' || viewerRole === 'ta'
  const canSubmitAssignments = viewerRole === 'student' || viewerRole === 'instructor' || viewerRole === 'ta'

  const fetchClassrooms = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ data: owned, error: ownedError }, { data: memberOf, error: memberError }] = await Promise.all([
        supabase
          .from('classrooms')
          .select('*, classroom_members(count)')
          .eq('owner_id', userId),
        supabase
          .from('classroom_members')
          .select('classroom:classrooms(*)')
          .eq('user_id', userId)
      ])

      if (ownedError) throw ownedError
      if (memberError) throw memberError

      const deduped = new Map<string, Classroom>()

      for (const classroom of owned || []) {
        deduped.set(classroom.id, {
          ...classroom,
          member_count: classroom.classroom_members?.[0]?.count || 0
        } as Classroom)
      }

      for (const entry of memberOf || []) {
        const classroom = (entry as { classroom?: Classroom | null }).classroom
        if (!classroom || deduped.has(classroom.id)) continue
        deduped.set(classroom.id, classroom)
      }

      setClassrooms(Array.from(deduped.values()).sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }))
    } catch (err) {
      console.error('Error fetching classrooms:', err)
      setError(err instanceof Error ? err.message : 'Failed to load classrooms')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const fetchClassroomDetails = useCallback(async (classroomId: string) => {
    setDetailLoading(true)
    setError(null)
    try {
      const [{ data: membersData, error: membersError }, { data: assignmentsData, error: assignmentsError }, { data: activityData, error: activityError }] = await Promise.all([
        supabase
          .from('classroom_members')
          .select('*')
          .eq('classroom_id', classroomId)
          .order('role', { ascending: true }),
        supabase
          .from('classroom_assignments')
          .select('*, assignment_submissions(count)')
          .eq('classroom_id', classroomId)
          .order('created_at', { ascending: false }),
        supabase
          .from('classroom_activity')
          .select('*')
          .eq('classroom_id', classroomId)
          .order('created_at', { ascending: false })
          .limit(12)
      ])

      if (membersError) throw membersError
      if (assignmentsError) throw assignmentsError
      if (activityError) throw activityError

      const normalizedMembers = (membersData || []) as ClassroomMember[]
      const normalizedAssignments = (assignmentsData || []).map((assignment: any) => ({
        ...assignment,
        submission_count: assignment.assignment_submissions?.[0]?.count || 0
      })) as Assignment[]

      const assignmentIds = normalizedAssignments.map((assignment) => assignment.id)
      let submissionRows: AssignmentSubmission[] = []

      if (assignmentIds.length > 0) {
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('assignment_submissions')
          .select('*')
          .in('assignment_id', assignmentIds)
          .order('submitted_at', { ascending: false })

        if (submissionsError) throw submissionsError
        submissionRows = (submissionsData || []) as AssignmentSubmission[]
      }

      setMembers(normalizedMembers)
      setAssignments(normalizedAssignments)
      setSubmissions(submissionRows)
      setActivities((activityData || []) as ClassroomActivity[])
      setViewerRole(normalizedMembers.find((member) => member.user_id === userId)?.role || null)
    } catch (err) {
      console.error('Error fetching classroom details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load classroom details')
    } finally {
      setDetailLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void fetchClassrooms()
  }, [fetchClassrooms])

  useEffect(() => {
    if (!selectedClassroom) return
    void fetchClassroomDetails(selectedClassroom.id)
  }, [fetchClassroomDetails, selectedClassroom])

  const logActivity = useCallback(async (classroomId: string, activityType: string, metadata: Record<string, unknown>) => {
    try {
      const { data } = await supabase
        .from('classroom_activity')
        .insert({
          classroom_id: classroomId,
          user_id: userId,
          activity_type: activityType,
          metadata
        })
        .select('*')
        .single()

      if (data) {
        setActivities((prev) => [data as ClassroomActivity, ...prev].slice(0, 12))
      }
    } catch (err) {
      console.error('Error logging classroom activity:', err)
    }
  }, [userId])

  const handleCreateClassroom = async () => {
    if (!newClassroom.name.trim()) {
      setError('Classroom name is required')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const { data, error: createError } = await supabase
        .from('classrooms')
        .insert({
          name: newClassroom.name.trim(),
          description: newClassroom.description.trim() || null,
          owner_id: userId,
          settings: {
            max_students: newClassroom.max_students,
            allow_collaboration: newClassroom.allow_collaboration,
            share_results: newClassroom.share_results,
            template_access: 'all',
            require_approval: false
          },
          starts_at: newClassroom.starts_at || null,
          ends_at: newClassroom.ends_at || null
        })
        .select()
        .single()

      if (createError) throw createError

      const { error: memberError } = await supabase.from('classroom_members').insert({
        classroom_id: data.id,
        user_id: userId,
        role: 'instructor'
      })

      if (memberError) throw memberError

      const createdClassroom = { ...(data as Classroom), member_count: 1 }
      setClassrooms((prev) => [createdClassroom, ...prev])
      setSelectedClassroom(createdClassroom)
      setViewerRole('instructor')
      setView('detail')
      setMembers([])
      setAssignments([])
      setSubmissions([])
      setActivities([])
      setNewClassroom({
        name: '',
        description: '',
        max_students: 50,
        allow_collaboration: true,
        share_results: false,
        starts_at: '',
        ends_at: ''
      })
      await logActivity(data.id, 'classroom_create', { classroom_name: data.name })
    } catch (err) {
      console.error('Error creating classroom:', err)
      setError(err instanceof Error ? err.message : 'Failed to create classroom')
    } finally {
      setSaving(false)
    }
  }

  const handleJoinClassroom = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a join code')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const { data, error: joinError } = await supabase.rpc('join_classroom_by_code', {
        p_join_code: joinCode.toUpperCase(),
        p_user_id: userId
      })

      if (joinError) throw joinError
      if (!data?.success) {
        setError(data?.error || 'Failed to join classroom')
        return
      }

      await fetchClassrooms()
      setJoinCode('')
      setView('list')
    } catch (err) {
      console.error('Error joining classroom:', err)
      setError(err instanceof Error ? err.message : 'Failed to join classroom')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClassroom = async (classroomId: string) => {
    if (!confirm('Are you sure you want to delete this classroom? This action cannot be undone.')) return

    setSaving(true)
    setError(null)
    try {
      const { error: deleteError } = await supabase.from('classrooms').delete().eq('id', classroomId)
      if (deleteError) throw deleteError

      setClassrooms((prev) => prev.filter((classroom) => classroom.id !== classroomId))
      if (selectedClassroom?.id === classroomId) {
        setSelectedClassroom(null)
        setView('list')
      }
    } catch (err) {
      console.error('Error deleting classroom:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete classroom')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateAssignment = async () => {
    if (!selectedClassroom || !canManageClassroom) return
    if (!newAssignment.title.trim()) {
      setError('Assignment title is required')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const template = templateById.get(newAssignment.template_id)
      const { data, error: insertError } = await supabase
        .from('classroom_assignments')
        .insert({
          classroom_id: selectedClassroom.id,
          title: newAssignment.title.trim(),
          description: newAssignment.description.trim() || null,
          template_id: newAssignment.template_id,
          custom_scenario: template
            ? {
                title: template.title,
                category: template.category,
                scenarioText: template.scenarioText
              }
            : null,
          due_date: newAssignment.due_date || null,
          points_possible: newAssignment.points_possible,
          is_published: newAssignment.is_published
        })
        .select('*, assignment_submissions(count)')
        .single()

      if (insertError) throw insertError

      const assignment = {
        ...(data as Assignment),
        submission_count: 0
      }
      setAssignments((prev) => [assignment, ...prev])
      setNewAssignment(DEFAULT_ASSIGNMENT_FORM)
      setShowAssignmentComposer(false)
      await logActivity(selectedClassroom.id, 'assignment_create', {
        assignment_id: assignment.id,
        assignment_title: assignment.title
      })

      if (assignment.is_published) {
        await logActivity(selectedClassroom.id, 'assignment_publish', {
          assignment_id: assignment.id,
          assignment_title: assignment.title
        })
      }
    } catch (err) {
      console.error('Error creating assignment:', err)
      setError(err instanceof Error ? err.message : 'Failed to create assignment')
    } finally {
      setSaving(false)
    }
  }

  const toggleAssignmentPublishState = async (assignment: Assignment) => {
    if (!selectedClassroom || !canManageClassroom) return

    setSaving(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('classroom_assignments')
        .update({ is_published: !assignment.is_published })
        .eq('id', assignment.id)

      if (updateError) throw updateError

      setAssignments((prev) => prev.map((entry) => (
        entry.id === assignment.id
          ? { ...entry, is_published: !entry.is_published }
          : entry
      )))

      await logActivity(selectedClassroom.id, assignment.is_published ? 'assignment_unpublish' : 'assignment_publish', {
        assignment_id: assignment.id,
        assignment_title: assignment.title
      })
    } catch (err) {
      console.error('Error updating assignment publish state:', err)
      setError(err instanceof Error ? err.message : 'Failed to update assignment state')
    } finally {
      setSaving(false)
    }
  }

  const submitAssignment = async (assignment: Assignment) => {
    if (!selectedClassroom || !canSubmitAssignments) return

    const draft = submissionDrafts[assignment.id] || { explanation: '', analysis_run_id: '' }
    if (!draft.explanation.trim() && !draft.analysis_run_id.trim()) {
      setError('Add a short explanation or an analysis run id before submitting')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const { data, error: insertError } = await supabase
        .from('assignment_submissions')
        .insert({
          assignment_id: assignment.id,
          student_id: userId,
          analysis_run_id: draft.analysis_run_id.trim() || null,
          explanation: draft.explanation.trim() || null
        })
        .select('*')
        .single()

      if (insertError) throw insertError

      setSubmissions((prev) => [data as AssignmentSubmission, ...prev])
      setAssignments((prev) => prev.map((entry) => (
        entry.id === assignment.id
          ? { ...entry, submission_count: (entry.submission_count || 0) + 1 }
          : entry
      )))
      setSubmissionDrafts((prev) => ({
        ...prev,
        [assignment.id]: { explanation: '', analysis_run_id: '' }
      }))
      await logActivity(selectedClassroom.id, 'submit', {
        assignment_id: assignment.id,
        assignment_title: assignment.title
      })
    } catch (err) {
      console.error('Error submitting assignment:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit assignment')
    } finally {
      setSaving(false)
    }
  }

  const gradeSubmission = async (submission: AssignmentSubmission) => {
    if (!selectedClassroom || !canManageClassroom) return

    const draft = gradingDrafts[submission.id] || {
      score: submission.score?.toString() || '',
      feedback: submission.feedback || ''
    }

    const parsedScore = Number(draft.score)
    if (!Number.isFinite(parsedScore)) {
      setError('A numeric score is required before saving a grade')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const { data, error: updateError } = await supabase
        .from('assignment_submissions')
        .update({
          score: parsedScore,
          feedback: draft.feedback.trim() || null,
          graded_by: userId,
          graded_at: new Date().toISOString()
        })
        .eq('id', submission.id)
        .select('*')
        .single()

      if (updateError) throw updateError

      setSubmissions((prev) => prev.map((entry) => entry.id === submission.id ? data as AssignmentSubmission : entry))
      await logActivity(selectedClassroom.id, 'grade', {
        assignment_id: submission.assignment_id,
        submission_id: submission.id,
        score: parsedScore
      })
    } catch (err) {
      console.error('Error grading submission:', err)
      setError(err instanceof Error ? err.message : 'Failed to save grade')
    } finally {
      setSaving(false)
    }
  }

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    window.setTimeout(() => setCopiedCode(false), 2000)
  }

  const getAssignmentSubmissions = (assignmentId: string) => {
    return submissions.filter((submission) => submission.assignment_id === assignmentId)
  }

  const getViewerSubmission = (assignmentId: string) => {
    return submissions.find((submission) => submission.assignment_id === assignmentId && submission.student_id === userId) || null
  }

  const renderClassroomList = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setView('create')}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600"
        >
          <Plus className="h-4 w-4" />
          Create classroom
        </button>
        <button
          onClick={() => setView('join')}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
        >
          <UserPlus className="h-4 w-4" />
          Join with code
        </button>
      </div>

      {classrooms.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800 py-12 text-center">
          <GraduationCap className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <h3 className="text-lg font-medium text-slate-300">No classrooms yet</h3>
          <p className="mt-2 text-sm text-slate-500">Create a classroom for assignments and cohort work, or join one with a code.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {classrooms.map((classroom) => (
            <button
              key={classroom.id}
              type="button"
              className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left transition-colors hover:border-indigo-500/50"
              onClick={() => {
                setSelectedClassroom(classroom)
                setView('detail')
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-500/15 p-2">
                    <BookOpen className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{classroom.name}</div>
                    <div className={`text-xs ${classroom.owner_id === userId ? 'text-indigo-300' : 'text-slate-500'}`}>
                      {classroom.owner_id === userId ? 'Instructor view' : 'Member view'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </div>

              {classroom.description && (
                <p className="mt-3 line-clamp-2 text-sm text-slate-400">{classroom.description}</p>
              )}

              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {classroom.member_count || 0} members
                </span>
                <span className={classroom.is_active ? 'text-green-400' : 'text-slate-500'}>
                  {classroom.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const renderCreateForm = () => (
    <div className="max-w-3xl rounded-xl border border-slate-700 bg-slate-800 p-6">
      <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-white">
        <Plus className="h-5 w-5 text-indigo-400" />
        Create classroom
      </h3>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-400">Classroom name</label>
          <input
            type="text"
            value={newClassroom.name}
            onChange={(event) => setNewClassroom((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Corporate Strategy Intensive - Summer Cohort"
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Description</label>
          <textarea
            value={newClassroom.description}
            onChange={(event) => setNewClassroom((prev) => ({ ...prev, description: event.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white"
            placeholder="Who is this cohort for, and what kind of assignments will they complete?"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Max students</label>
            <input
              type="number"
              value={newClassroom.max_students}
              min={1}
              max={500}
              onChange={(event) => setNewClassroom((prev) => ({ ...prev, max_students: Number(event.target.value) || 50 }))}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Start date</label>
            <input
              type="date"
              value={newClassroom.starts_at}
              onChange={(event) => setNewClassroom((prev) => ({ ...prev, starts_at: event.target.value }))}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white"
            />
          </div>
        </div>
        <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/40 p-4">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={newClassroom.allow_collaboration}
              onChange={(event) => setNewClassroom((prev) => ({ ...prev, allow_collaboration: event.target.checked }))}
            />
            Allow collaboration between students
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={newClassroom.share_results}
              onChange={(event) => setNewClassroom((prev) => ({ ...prev, share_results: event.target.checked }))}
            />
            Share selected strategy results back to the class
          </label>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleCreateClassroom}
            disabled={saving}
            className="rounded-lg bg-indigo-500 px-6 py-2 font-medium text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            Create classroom
          </button>
          <button
            onClick={() => setView('list')}
            className="rounded-lg bg-slate-700 px-6 py-2 text-white hover:bg-slate-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )

  const renderJoinForm = () => (
    <div className="max-w-md rounded-xl border border-slate-700 bg-slate-800 p-6">
      <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-white">
        <UserPlus className="h-5 w-5 text-indigo-400" />
        Join classroom
      </h3>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-400">Join code</label>
          <input
            type="text"
            maxLength={6}
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-center font-mono text-2xl tracking-widest text-white"
            placeholder="ABC123"
          />
          <p className="mt-2 text-xs text-slate-500">Ask the instructor for the six-character code.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleJoinClassroom}
            disabled={saving || joinCode.length !== 6}
            className="flex-1 rounded-lg bg-indigo-500 px-6 py-2 font-medium text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
          >
            Join classroom
          </button>
          <button
            onClick={() => setView('list')}
            className="rounded-lg bg-slate-700 px-6 py-2 text-white hover:bg-slate-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )

  const renderAssignmentComposer = () => (
    <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4">
      <h4 className="mb-4 flex items-center gap-2 font-semibold text-white">
        <ClipboardList className="h-4 w-4 text-indigo-300" />
        New assignment
      </h4>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <label className="mb-1 block text-sm text-slate-300">Title</label>
          <input
            type="text"
            value={newAssignment.title}
            onChange={(event) => setNewAssignment((prev) => ({ ...prev, title: event.target.value }))}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white"
            placeholder="Week 2: Supply shock response"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Template</label>
          <select
            value={newAssignment.template_id}
            onChange={(event) => setNewAssignment((prev) => ({ ...prev, template_id: event.target.value }))}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white"
          >
            {CLASSROOM_TEMPLATE_OPTIONS.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title} · {template.category}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-400">{templateById.get(newAssignment.template_id)?.description}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Due date</label>
          <input
            type="datetime-local"
            value={newAssignment.due_date}
            onChange={(event) => setNewAssignment((prev) => ({ ...prev, due_date: event.target.value }))}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Points</label>
          <input
            type="number"
            value={newAssignment.points_possible}
            min={1}
            max={500}
            onChange={(event) => setNewAssignment((prev) => ({ ...prev, points_possible: Number(event.target.value) || 100 }))}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white"
          />
        </div>
        <div className="flex items-center pt-7">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={newAssignment.is_published}
              onChange={(event) => setNewAssignment((prev) => ({ ...prev, is_published: event.target.checked }))}
            />
            Publish immediately
          </label>
        </div>
        <div className="lg:col-span-2">
          <label className="mb-1 block text-sm text-slate-300">Instructor brief</label>
          <textarea
            value={newAssignment.description}
            onChange={(event) => setNewAssignment((prev) => ({ ...prev, description: event.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white"
            placeholder="Clarify the deliverable, the decision frame, and what good work should include."
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={handleCreateAssignment}
          disabled={saving}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          Save assignment
        </button>
        <button
          onClick={() => {
            setShowAssignmentComposer(false)
            setNewAssignment(DEFAULT_ASSIGNMENT_FORM)
          }}
          className="rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
        >
          Cancel
        </button>
      </div>
    </div>
  )

  const renderAssignmentCard = (assignment: Assignment) => {
    const template = templateById.get(assignment.template_id)
    const assignmentSubmissions = getAssignmentSubmissions(assignment.id)
    const mySubmission = getViewerSubmission(assignment.id)
    const submissionDraft = submissionDrafts[assignment.id] || { explanation: '', analysis_run_id: '' }

    return (
      <div key={assignment.id} className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold text-white">{assignment.title}</h4>
              <span className={`rounded-full px-2 py-1 text-xs ${
                assignment.is_published ? 'bg-green-500/20 text-green-300' : 'bg-slate-700 text-slate-300'
              }`}>
                {assignment.is_published ? 'Published' : 'Draft'}
              </span>
              {template && (
                <span className="rounded-full bg-indigo-500/15 px-2 py-1 text-xs text-indigo-200">
                  {template.title}
                </span>
              )}
            </div>
            {assignment.description && (
              <p className="text-sm text-slate-300">{assignment.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Award className="h-4 w-4" />
                {assignment.points_possible} points
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-4 w-4" />
                {assignment.submission_count || 0} submissions
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {assignment.due_date ? `Due ${formatDate(assignment.due_date)}` : 'No due date'}
              </span>
            </div>
          </div>
          {canManageClassroom && (
            <button
              onClick={() => void toggleAssignmentPublishState(assignment)}
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
            >
              {assignment.is_published ? 'Move to draft' : 'Publish'}
            </button>
          )}
        </div>

        {canSubmitAssignments && assignment.is_published && !mySubmission && (
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/70 p-4">
            <div className="text-sm font-medium text-white">Submit response</div>
            <div className="mt-3 space-y-3">
              <textarea
                value={submissionDraft.explanation}
                onChange={(event) => setSubmissionDrafts((prev) => ({
                  ...prev,
                  [assignment.id]: { ...submissionDraft, explanation: event.target.value }
                }))}
                rows={3}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white"
                placeholder="Summarize your reasoning, decision, and what evidence or game structure you relied on."
              />
              <input
                type="text"
                value={submissionDraft.analysis_run_id}
                onChange={(event) => setSubmissionDrafts((prev) => ({
                  ...prev,
                  [assignment.id]: { ...submissionDraft, analysis_run_id: event.target.value }
                }))}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white"
                placeholder="Optional linked analysis_run_id"
              />
              <button
                onClick={() => void submitAssignment(assignment)}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                <Send className="h-4 w-4" />
                Submit assignment
              </button>
            </div>
          </div>
        )}

        {mySubmission && (
          <div className="mt-4 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium text-green-100">Your submission is recorded</div>
              <div className="text-xs text-green-200/80">{formatDate(mySubmission.submitted_at)}</div>
            </div>
            {mySubmission.explanation && (
              <p className="mt-2 text-sm text-slate-200">{mySubmission.explanation}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-300">
              {mySubmission.analysis_run_id && <span>Analysis run: {mySubmission.analysis_run_id}</span>}
              {typeof mySubmission.score === 'number' && <span>Score: {mySubmission.score}</span>}
              {mySubmission.feedback && <span>Feedback posted</span>}
            </div>
          </div>
        )}

        {assignmentSubmissions.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="text-sm font-medium text-slate-200">
              {canManageClassroom ? 'Submission review' : 'Submission status'}
            </div>
            {assignmentSubmissions.map((submission) => {
              const gradeDraft = gradingDrafts[submission.id] || {
                score: submission.score?.toString() || '',
                feedback: submission.feedback || ''
              }

              return (
                <div key={submission.id} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm text-white">Learner {submission.student_id.slice(0, 8)}</div>
                    <div className="text-xs text-slate-400">{formatDate(submission.submitted_at)}</div>
                  </div>
                  {submission.explanation && (
                    <p className="mt-2 text-sm text-slate-300">{submission.explanation}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
                    {submission.analysis_run_id && <span>Analysis run: {submission.analysis_run_id}</span>}
                    {typeof submission.score === 'number' && <span>Score: {submission.score}</span>}
                    {submission.graded_at && <span>Graded {formatDate(submission.graded_at)}</span>}
                  </div>

                  {canManageClassroom && (
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr_auto]">
                      <input
                        type="number"
                        min={0}
                        max={assignment.points_possible}
                        value={gradeDraft.score}
                        onChange={(event) => setGradingDrafts((prev) => ({
                          ...prev,
                          [submission.id]: { ...gradeDraft, score: event.target.value }
                        }))}
                        className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white"
                        placeholder="Score"
                      />
                      <textarea
                        value={gradeDraft.feedback}
                        onChange={(event) => setGradingDrafts((prev) => ({
                          ...prev,
                          [submission.id]: { ...gradeDraft, feedback: event.target.value }
                        }))}
                        rows={2}
                        className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white"
                        placeholder="Feedback for the learner"
                      />
                      <button
                        onClick={() => void gradeSubmission(submission)}
                        disabled={saving}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                      >
                        Save grade
                      </button>
                    </div>
                  )}

                  {!canManageClassroom && submission.feedback && (
                    <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-300">
                      {submission.feedback}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const renderClassroomDetail = () => {
    if (!selectedClassroom) return null

    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button
                onClick={() => {
                  setSelectedClassroom(null)
                  setViewerRole(null)
                  setView('list')
                }}
                className="mb-2 text-sm text-slate-400 hover:text-white"
              >
                ← Back to classrooms
              </button>
              <h2 className="text-2xl font-bold text-white">{selectedClassroom.name}</h2>
              {selectedClassroom.description && (
                <p className="mt-1 text-slate-400">{selectedClassroom.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-700 px-3 py-1 text-slate-200">
                  Mode: {educationMode}
                </span>
                {viewerRole && (
                  <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-indigo-200">
                    Role: {viewerRole}
                  </span>
                )}
                {selectedClassroom.settings?.lti_context_id && (
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-200">
                    LTI linked
                  </span>
                )}
              </div>
            </div>

            {isOwner && (
              <button
                onClick={() => void handleDeleteClassroom(selectedClassroom.id)}
                className="rounded-lg bg-red-500/15 p-2 text-red-300 hover:bg-red-500/25"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {canManageClassroom && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900/40 p-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Join code</div>
                <div className="font-mono text-2xl tracking-[0.3em] text-indigo-300">{selectedClassroom.join_code}</div>
              </div>
              <button
                onClick={() => copyJoinCode(selectedClassroom.join_code)}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
              >
                {copiedCode ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                {copiedCode ? 'Copied' : 'Copy code'}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <div className="text-sm text-slate-400">Members</div>
            <div className="mt-1 text-2xl font-bold text-white">{members.length}</div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <div className="text-sm text-slate-400">Assignments</div>
            <div className="mt-1 text-2xl font-bold text-white">{assignments.length}</div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <div className="text-sm text-slate-400">Submissions</div>
            <div className="mt-1 text-2xl font-bold text-white">{submissions.length}</div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <div className="text-sm text-slate-400">Status</div>
            <div className={`mt-1 text-lg font-bold ${selectedClassroom.is_active ? 'text-green-400' : 'text-slate-500'}`}>
              {selectedClassroom.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-700 bg-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 p-4">
                <div>
                  <h3 className="flex items-center gap-2 font-semibold text-white">
                    <FileText className="h-5 w-5 text-indigo-400" />
                    Assignments
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Tie scenario templates to a concrete deliverable, then track submissions and grading.
                  </p>
                </div>
                {canManageClassroom && (
                  <button
                    onClick={() => setShowAssignmentComposer((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-sm text-white hover:bg-indigo-600"
                  >
                    <Plus className="h-4 w-4" />
                    {showAssignmentComposer ? 'Close composer' : 'New assignment'}
                  </button>
                )}
              </div>
              <div className="space-y-4 p-4">
                {showAssignmentComposer && renderAssignmentComposer()}
                {assignments.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center text-slate-500">
                    No assignments yet. Create one to connect a scenario template, due date, and learner submission workflow.
                  </div>
                ) : (
                  assignments.map(renderAssignmentCard)
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800">
              <div className="border-b border-slate-700 p-4">
                <h3 className="flex items-center gap-2 font-semibold text-white">
                  <Shield className="h-5 w-5 text-indigo-400" />
                  Cohort memory
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Latest classroom activity across join events, assignment publication, submissions, and grading.
                </p>
              </div>
              <div className="space-y-3 p-4">
                {activities.length === 0 ? (
                  <div className="text-sm text-slate-500">No activity yet.</div>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm text-white">{getActivityLabel(activity)}</div>
                        <div className="text-xs text-slate-500">{formatDate(activity.created_at)}</div>
                      </div>
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <div className="mt-2 text-xs text-slate-400">
                          {JSON.stringify(activity.metadata)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-slate-700 bg-slate-800">
              <div className="border-b border-slate-700 p-4">
                <h3 className="flex items-center gap-2 font-semibold text-white">
                  <Users className="h-5 w-5 text-indigo-400" />
                  Members
                </h3>
              </div>
              <div className="divide-y divide-slate-700">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <div className="text-sm text-white">User {member.user_id.slice(0, 8)}</div>
                      <div className="text-xs capitalize text-slate-500">{member.role}</div>
                    </div>
                    <div className="text-xs text-slate-500">{formatDate(member.joined_at)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <BookOpen className="h-5 w-5 text-indigo-400" />
                Template coverage
              </h3>
              <div className="mt-3 space-y-3">
                {CLASSROOM_TEMPLATE_OPTIONS.map((template) => (
                  <div key={template.id} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                    <div className="text-sm font-medium text-white">{template.title}</div>
                    <div className="mt-1 text-xs text-indigo-200">{template.category}</div>
                    <p className="mt-2 text-xs text-slate-400">{template.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
        <div className="flex items-center gap-4">
          <GraduationCap className="h-10 w-10" />
          <div>
            <h2 className="text-2xl font-bold">Classroom Manager</h2>
            <p className="text-indigo-100">Run scenario-based assignments, track submissions, and keep grading visible for institutional delivery.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <span className="text-sm text-red-300">{error}</span>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-red-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
        </div>
      ) : detailLoading && view === 'detail' ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          {view === 'list' && renderClassroomList()}
          {view === 'create' && renderCreateForm()}
          {view === 'join' && renderJoinForm()}
          {view === 'detail' && renderClassroomDetail()}
        </>
      )}
    </div>
  )
}

export default ClassroomManager
