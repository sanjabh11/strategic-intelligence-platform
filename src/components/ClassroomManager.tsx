// Classroom Manager Component
// Manages private classroom instances for educators
// Part of Monetization Strategy Phase 2 - Educational Market

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Settings, Copy, Check, X, Clock, 
  BookOpen, FileText, BarChart3, ChevronRight, 
  GraduationCap, Shield, Link2, Trash2, Edit2,
  UserPlus, Send, Award, Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Classroom {
  id: string;
  name: string;
  description: string;
  join_code: string;
  owner_id: string;
  settings: {
    max_students: number;
    allow_collaboration: boolean;
    share_results: boolean;
    template_access: string;
    require_approval: boolean;
  };
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  member_count?: number;
}

interface ClassroomMember {
  id: string;
  user_id: string;
  role: 'instructor' | 'ta' | 'student' | 'observer';
  joined_at: string;
  last_active_at: string;
  user?: {
    email: string;
    user_metadata: { full_name?: string };
  };
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  template_id: string;
  due_date: string | null;
  points_possible: number;
  is_published: boolean;
  submission_count?: number;
}

interface ClassroomManagerProps {
  userId: string;
}

const ClassroomManager: React.FC<ClassroomManagerProps> = ({ userId }) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [members, setMembers] = useState<ClassroomMember[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'detail' | 'create' | 'join'>('list');
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New classroom form state
  const [newClassroom, setNewClassroom] = useState({
    name: '',
    description: '',
    max_students: 50,
    allow_collaboration: true,
    share_results: false,
    starts_at: '',
    ends_at: ''
  });

  // Fetch user's classrooms
  const fetchClassrooms = useCallback(async () => {
    setLoading(true);
    try {
      // Get owned classrooms
      const { data: owned, error: ownedError } = await supabase
        .from('classrooms')
        .select('*, classroom_members(count)')
        .eq('owner_id', userId);

      // Get member classrooms
      const { data: memberOf, error: memberError } = await supabase
        .from('classroom_members')
        .select('classroom:classrooms(*)')
        .eq('user_id', userId);

      if (ownedError) throw ownedError;

      const ownedClassrooms = (owned || []).map(c => ({
        ...c,
        member_count: c.classroom_members?.[0]?.count || 0
      }));

      const memberClassrooms = (memberOf || [])
        .map((m: any) => m.classroom)
        .filter((c: any) => c && c.owner_id !== userId);

      setClassrooms([...ownedClassrooms, ...memberClassrooms]);
    } catch (err) {
      console.error('Error fetching classrooms:', err);
      setError('Failed to load classrooms');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch classroom details
  const fetchClassroomDetails = useCallback(async (classroomId: string) => {
    try {
      // Fetch members
      const { data: membersData } = await supabase
        .from('classroom_members')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('role', { ascending: true });

      setMembers(membersData || []);

      // Fetch assignments
      const { data: assignmentsData } = await supabase
        .from('classroom_assignments')
        .select('*, assignment_submissions(count)')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false });

      setAssignments((assignmentsData || []).map(a => ({
        ...a,
        submission_count: a.assignment_submissions?.[0]?.count || 0
      })));
    } catch (err) {
      console.error('Error fetching classroom details:', err);
    }
  }, []);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  useEffect(() => {
    if (selectedClassroom) {
      fetchClassroomDetails(selectedClassroom.id);
    }
  }, [selectedClassroom, fetchClassroomDetails]);

  // Create classroom
  const handleCreateClassroom = async () => {
    if (!newClassroom.name.trim()) {
      setError('Classroom name is required');
      return;
    }

    try {
      const { data, error: createError } = await supabase
        .from('classrooms')
        .insert({
          name: newClassroom.name,
          description: newClassroom.description,
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
        .single();

      if (createError) throw createError;

      // Add owner as instructor
      await supabase.from('classroom_members').insert({
        classroom_id: data.id,
        user_id: userId,
        role: 'instructor'
      });

      setClassrooms(prev => [data, ...prev]);
      setView('list');
      setNewClassroom({
        name: '',
        description: '',
        max_students: 50,
        allow_collaboration: true,
        share_results: false,
        starts_at: '',
        ends_at: ''
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create classroom');
    }
  };

  // Join classroom by code
  const handleJoinClassroom = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a join code');
      return;
    }

    try {
      const { data, error: joinError } = await supabase
        .rpc('join_classroom_by_code', {
          p_join_code: joinCode.toUpperCase(),
          p_user_id: userId
        });

      if (joinError) throw joinError;

      if (!data.success) {
        setError(data.error);
        return;
      }

      await fetchClassrooms();
      setView('list');
      setJoinCode('');
    } catch (err: any) {
      setError(err.message || 'Failed to join classroom');
    }
  };

  // Copy join code
  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Delete classroom
  const handleDeleteClassroom = async (classroomId: string) => {
    if (!confirm('Are you sure you want to delete this classroom? This action cannot be undone.')) {
      return;
    }

    try {
      await supabase.from('classrooms').delete().eq('id', classroomId);
      setClassrooms(prev => prev.filter(c => c.id !== classroomId));
      if (selectedClassroom?.id === classroomId) {
        setSelectedClassroom(null);
        setView('list');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete classroom');
    }
  };

  // Render classroom list
  const renderClassroomList = () => (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => setView('create')}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Classroom
        </button>
        <button
          onClick={() => setView('join')}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Join with Code
        </button>
      </div>

      {/* Classroom Grid */}
      {classrooms.length === 0 ? (
        <div className="text-center py-12 bg-slate-800 rounded-xl border border-slate-700">
          <GraduationCap className="w-12 h-12 mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">No Classrooms Yet</h3>
          <p className="text-slate-500 mb-4">Create your first classroom or join one with a code.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map(classroom => (
            <div
              key={classroom.id}
              className="bg-slate-800 rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedClassroom(classroom);
                setView('detail');
              }}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                      <BookOpen className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{classroom.name}</h3>
                      <span className={`text-xs ${classroom.owner_id === userId ? 'text-indigo-400' : 'text-slate-500'}`}>
                        {classroom.owner_id === userId ? 'Instructor' : 'Student'}
                      </span>
                    </div>
                  </div>
                  {classroom.is_active && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                      Active
                    </span>
                  )}
                </div>

                {classroom.description && (
                  <p className="text-sm text-slate-400 mb-3 line-clamp-2">{classroom.description}</p>
                )}

                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {classroom.member_count || 0} members
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render create form
  const renderCreateForm = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 max-w-2xl">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Plus className="w-5 h-5 text-indigo-400" />
        Create New Classroom
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Classroom Name *</label>
          <input
            type="text"
            value={newClassroom.name}
            onChange={(e) => setNewClassroom(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g., Game Theory 101 - Fall 2025"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Description</label>
          <textarea
            value={newClassroom.description}
            onChange={(e) => setNewClassroom(p => ({ ...p, description: e.target.value }))}
            placeholder="Brief description of the course..."
            rows={3}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Max Students</label>
            <input
              type="number"
              value={newClassroom.max_students}
              onChange={(e) => setNewClassroom(p => ({ ...p, max_students: parseInt(e.target.value) || 50 }))}
              min={1}
              max={500}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Start Date</label>
            <input
              type="date"
              value={newClassroom.starts_at}
              onChange={(e) => setNewClassroom(p => ({ ...p, starts_at: e.target.value }))}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newClassroom.allow_collaboration}
              onChange={(e) => setNewClassroom(p => ({ ...p, allow_collaboration: e.target.checked }))}
              className="rounded bg-slate-700 border-slate-600"
            />
            <span className="text-slate-300">Allow student collaboration</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newClassroom.share_results}
              onChange={(e) => setNewClassroom(p => ({ ...p, share_results: e.target.checked }))}
              className="rounded bg-slate-700 border-slate-600"
            />
            <span className="text-slate-300">Share analysis results with class</span>
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleCreateClassroom}
            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium"
          >
            Create Classroom
          </button>
          <button
            onClick={() => setView('list')}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // Render join form
  const renderJoinForm = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 max-w-md">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-indigo-400" />
        Join Classroom
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Join Code</label>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter 6-character code"
            maxLength={6}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-center text-2xl tracking-widest font-mono"
          />
          <p className="text-xs text-slate-500 mt-1">Ask your instructor for the classroom join code</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleJoinClassroom}
            disabled={joinCode.length !== 6}
            className="flex-1 px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium"
          >
            Join Classroom
          </button>
          <button
            onClick={() => setView('list')}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // Render classroom detail
  const renderClassroomDetail = () => {
    if (!selectedClassroom) return null;
    const isOwner = selectedClassroom.owner_id === userId;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <div>
              <button
                onClick={() => { setSelectedClassroom(null); setView('list'); }}
                className="text-slate-400 hover:text-white text-sm mb-2 flex items-center gap-1"
              >
                ← Back to Classrooms
              </button>
              <h2 className="text-2xl font-bold text-white">{selectedClassroom.name}</h2>
              {selectedClassroom.description && (
                <p className="text-slate-400 mt-1">{selectedClassroom.description}</p>
              )}
            </div>
            {isOwner && (
              <div className="flex gap-2">
                <button className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg">
                  <Edit2 className="w-4 h-4 text-slate-400" />
                </button>
                <button 
                  onClick={() => handleDeleteClassroom(selectedClassroom.id)}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            )}
          </div>

          {/* Join Code */}
          {isOwner && (
            <div className="bg-slate-700 rounded-lg p-4 flex items-center justify-between">
              <div>
                <span className="text-sm text-slate-400">Join Code:</span>
                <span className="ml-2 text-xl font-mono font-bold text-indigo-400 tracking-widest">
                  {selectedClassroom.join_code}
                </span>
              </div>
              <button
                onClick={() => copyJoinCode(selectedClassroom.join_code)}
                className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded-lg flex items-center gap-1 text-sm"
              >
                {copiedCode ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copiedCode ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">Members</span>
            </div>
            <div className="text-2xl font-bold text-white">{members.length}</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-sm">Assignments</span>
            </div>
            <div className="text-2xl font-bold text-white">{assignments.length}</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">Submissions</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {assignments.reduce((sum, a) => sum + (a.submission_count || 0), 0)}
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Status</span>
            </div>
            <div className={`text-lg font-bold ${selectedClassroom.is_active ? 'text-green-400' : 'text-slate-500'}`}>
              {selectedClassroom.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Members ({members.length})
            </h3>
            {isOwner && (
              <button className="text-sm text-indigo-400 hover:text-indigo-300">
                Invite Members
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-700">
            {members.map(member => (
              <div key={member.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    member.role === 'instructor' ? 'bg-indigo-500/20' :
                    member.role === 'ta' ? 'bg-purple-500/20' : 'bg-slate-700'
                  }`}>
                    <span className="text-sm font-medium">
                      {member.role === 'instructor' ? '👨‍🏫' : member.role === 'ta' ? '📚' : '👤'}
                    </span>
                  </div>
                  <div>
                    <div className="text-white text-sm">User {member.user_id.slice(0, 8)}</div>
                    <div className="text-xs text-slate-500 capitalize">{member.role}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Joined {new Date(member.joined_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assignments */}
        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Assignments ({assignments.length})
            </h3>
            {isOwner && (
              <button className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm text-white flex items-center gap-1">
                <Plus className="w-4 h-4" />
                New Assignment
              </button>
            )}
          </div>
          {assignments.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No assignments yet
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {assignments.map(assignment => (
                <div key={assignment.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">{assignment.title}</div>
                    <div className="text-sm text-slate-400">
                      {assignment.submission_count || 0} submissions • {assignment.points_possible} points
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {assignment.due_date && (
                      <span className="text-sm text-slate-500 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Due {new Date(assignment.due_date).toLocaleDateString()}
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      assignment.is_published ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {assignment.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-xl text-white">
        <div className="flex items-center gap-4">
          <GraduationCap className="w-10 h-10" />
          <div>
            <h2 className="text-2xl font-bold">Classroom Manager</h2>
            <p className="text-indigo-200">Create and manage private classroom instances</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center justify-between">
          <span className="text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
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
  );
};

export default ClassroomManager;
