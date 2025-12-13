-- Migration: LMS Integration & Private Classroom Instances
-- Supports Canvas, Moodle, Blackboard via LTI 1.3
-- Part of Monetization Strategy Phase 2

-- LTI Platform registrations (Canvas, Moodle instances)
CREATE TABLE IF NOT EXISTS public.lti_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  platform_type text NOT NULL CHECK (platform_type IN ('canvas', 'moodle', 'blackboard', 'brightspace', 'other')),
  issuer text NOT NULL UNIQUE, -- LTI 1.3 issuer URL
  client_id text NOT NULL,
  auth_endpoint text NOT NULL,
  token_endpoint text NOT NULL,
  jwks_endpoint text NOT NULL,
  deployment_id text,
  institution_name text,
  institution_domain text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- LTI tool configurations (our app as LTI tool)
CREATE TABLE IF NOT EXISTS public.lti_tool_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name text DEFAULT 'Strategic Intelligence Platform',
  tool_url text NOT NULL,
  login_url text NOT NULL,
  redirect_url text NOT NULL,
  jwks_url text NOT NULL,
  public_key text,
  private_key text, -- Encrypted
  created_at timestamptz DEFAULT now()
);

-- LTI launch sessions
CREATE TABLE IF NOT EXISTS public.lti_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id uuid REFERENCES public.lti_platforms(id),
  user_id uuid REFERENCES auth.users(id),
  lti_user_id text NOT NULL,
  lti_context_id text, -- Course ID in LMS
  lti_context_title text, -- Course name
  lti_roles text[], -- LTI roles (instructor, student, etc.)
  launch_data jsonb,
  state text UNIQUE,
  nonce text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Private classroom instances
CREATE TABLE IF NOT EXISTS public.classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  institution_id uuid REFERENCES public.lti_platforms(id),
  owner_id uuid REFERENCES auth.users(id) NOT NULL,
  join_code text UNIQUE,
  settings jsonb DEFAULT '{
    "max_students": 50,
    "allow_collaboration": true,
    "share_results": false,
    "template_access": "all",
    "custom_templates_only": false,
    "require_approval": false
  }'::jsonb,
  is_active boolean DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Classroom memberships
CREATE TABLE IF NOT EXISTS public.classroom_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('instructor', 'ta', 'student', 'observer')),
  lti_session_id uuid REFERENCES public.lti_sessions(id),
  joined_at timestamptz DEFAULT now(),
  last_active_at timestamptz DEFAULT now(),
  UNIQUE(classroom_id, user_id)
);

-- Classroom assignments (linked scenarios/templates)
CREATE TABLE IF NOT EXISTS public.classroom_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  template_id text, -- Reference to scenario template
  custom_scenario jsonb,
  due_date timestamptz,
  points_possible int DEFAULT 100,
  settings jsonb DEFAULT '{
    "allow_late": true,
    "show_solution_after_due": true,
    "require_explanation": true,
    "peer_review": false
  }'::jsonb,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Student assignment submissions
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_run_id uuid, -- Reference to analysis_runs table
  explanation text,
  score int,
  feedback text,
  graded_by uuid REFERENCES auth.users(id),
  graded_at timestamptz,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

-- Classroom activity log
CREATE TABLE IF NOT EXISTS public.classroom_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  activity_type text NOT NULL, -- 'join', 'leave', 'submit', 'grade', 'analysis', 'comment'
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Generate unique join codes
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Auto-generate join code on classroom creation
CREATE OR REPLACE FUNCTION set_classroom_join_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.join_code IS NULL THEN
    NEW.join_code := generate_join_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER classroom_join_code_trigger
  BEFORE INSERT ON public.classrooms
  FOR EACH ROW
  EXECUTE FUNCTION set_classroom_join_code();

-- Function to join classroom by code
CREATE OR REPLACE FUNCTION public.join_classroom_by_code(
  p_join_code text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_classroom record;
  v_settings jsonb;
BEGIN
  -- Find classroom
  SELECT * INTO v_classroom
  FROM public.classrooms
  WHERE join_code = upper(p_join_code) AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired join code');
  END IF;
  
  -- Check if already a member
  IF EXISTS (SELECT 1 FROM public.classroom_members WHERE classroom_id = v_classroom.id AND user_id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already a member of this classroom');
  END IF;
  
  -- Check max students
  v_settings := v_classroom.settings;
  IF (SELECT COUNT(*) FROM public.classroom_members WHERE classroom_id = v_classroom.id AND role = 'student') >= (v_settings->>'max_students')::int THEN
    RETURN jsonb_build_object('success', false, 'error', 'Classroom is full');
  END IF;
  
  -- Add member
  INSERT INTO public.classroom_members (classroom_id, user_id, role)
  VALUES (v_classroom.id, p_user_id, 'student');
  
  -- Log activity
  INSERT INTO public.classroom_activity (classroom_id, user_id, activity_type)
  VALUES (v_classroom.id, p_user_id, 'join');
  
  RETURN jsonb_build_object(
    'success', true,
    'classroom_id', v_classroom.id,
    'classroom_name', v_classroom.name
  );
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lti_platforms_issuer ON public.lti_platforms(issuer);
CREATE INDEX IF NOT EXISTS idx_lti_sessions_state ON public.lti_sessions(state);
CREATE INDEX IF NOT EXISTS idx_classrooms_owner ON public.classrooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_join_code ON public.classrooms(join_code);
CREATE INDEX IF NOT EXISTS idx_classroom_members_user ON public.classroom_members(user_id);
CREATE INDEX IF NOT EXISTS idx_classroom_members_classroom ON public.classroom_members(classroom_id);
CREATE INDEX IF NOT EXISTS idx_assignments_classroom ON public.classroom_assignments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.assignment_submissions(assignment_id);

-- RLS Policies
ALTER TABLE public.lti_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lti_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Classrooms: owners and members can view
CREATE POLICY classrooms_select ON public.classrooms
  FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.classroom_members WHERE classroom_id = id AND user_id = auth.uid())
  );

-- Classrooms: only owners can modify
CREATE POLICY classrooms_modify ON public.classrooms
  FOR ALL USING (owner_id = auth.uid());

-- Members: visible to classroom members
CREATE POLICY members_select ON public.classroom_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.classrooms WHERE id = classroom_id AND owner_id = auth.uid())
  );

-- Assignments: visible to classroom members
CREATE POLICY assignments_select ON public.classroom_assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.classroom_members WHERE classroom_id = classroom_assignments.classroom_id AND user_id = auth.uid())
  );

-- Submissions: students see own, instructors see all in classroom
CREATE POLICY submissions_select ON public.assignment_submissions
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.classroom_members cm
      JOIN public.classroom_assignments ca ON ca.classroom_id = cm.classroom_id
      WHERE ca.id = assignment_id AND cm.user_id = auth.uid() AND cm.role IN ('instructor', 'ta')
    )
  );

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.join_classroom_by_code(text, uuid) TO authenticated;
GRANT SELECT ON public.classrooms TO authenticated;
GRANT SELECT ON public.classroom_members TO authenticated;
GRANT SELECT ON public.classroom_assignments TO authenticated;
GRANT SELECT ON public.assignment_submissions TO authenticated;
