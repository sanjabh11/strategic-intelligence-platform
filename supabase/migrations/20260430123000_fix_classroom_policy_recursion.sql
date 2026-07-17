-- Fix recursive classroom RLS policies by routing membership checks through
-- security-definer helpers that bypass table-level RLS recursion.

CREATE OR REPLACE FUNCTION public.classroom_is_owner(p_classroom_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classrooms c
    WHERE c.id = p_classroom_id
      AND c.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.classroom_has_member_role(
  p_classroom_id uuid,
  p_roles text[] DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classroom_members cm
    WHERE cm.classroom_id = p_classroom_id
      AND cm.user_id = auth.uid()
      AND (
        p_roles IS NULL
        OR cm.role = ANY (p_roles)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.classroom_can_view(p_classroom_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.classroom_is_owner(p_classroom_id)
    OR public.classroom_has_member_role(p_classroom_id, NULL);
$$;

CREATE OR REPLACE FUNCTION public.classroom_can_manage(p_classroom_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.classroom_is_owner(p_classroom_id)
    OR public.classroom_has_member_role(p_classroom_id, ARRAY['instructor', 'ta']);
$$;

CREATE OR REPLACE FUNCTION public.classroom_assignment_can_manage(p_assignment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classroom_assignments ca
    WHERE ca.id = p_assignment_id
      AND public.classroom_can_manage(ca.classroom_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.classroom_assignment_can_submit(p_assignment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classroom_assignments ca
    WHERE ca.id = p_assignment_id
      AND (
        public.classroom_can_manage(ca.classroom_id)
        OR public.classroom_has_member_role(ca.classroom_id, ARRAY['student', 'instructor', 'ta'])
      )
  );
$$;

DROP POLICY IF EXISTS classrooms_select ON public.classrooms;
DROP POLICY IF EXISTS classrooms_modify ON public.classrooms;
DROP POLICY IF EXISTS classrooms_insert ON public.classrooms;
DROP POLICY IF EXISTS classrooms_update ON public.classrooms;
DROP POLICY IF EXISTS classrooms_delete ON public.classrooms;

CREATE POLICY classrooms_select ON public.classrooms
  FOR SELECT
  USING (public.classroom_can_view(id));

CREATE POLICY classrooms_insert ON public.classrooms
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY classrooms_update ON public.classrooms
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY classrooms_delete ON public.classrooms
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS members_select ON public.classroom_members;
DROP POLICY IF EXISTS members_insert ON public.classroom_members;
DROP POLICY IF EXISTS members_update ON public.classroom_members;

CREATE POLICY members_select ON public.classroom_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.classroom_can_view(classroom_id)
  );

CREATE POLICY members_insert ON public.classroom_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.classroom_can_manage(classroom_id));

CREATE POLICY members_update ON public.classroom_members
  FOR UPDATE
  TO authenticated
  USING (public.classroom_can_manage(classroom_id))
  WITH CHECK (public.classroom_can_manage(classroom_id));

DROP POLICY IF EXISTS assignments_select ON public.classroom_assignments;
DROP POLICY IF EXISTS assignments_insert ON public.classroom_assignments;
DROP POLICY IF EXISTS assignments_update ON public.classroom_assignments;
DROP POLICY IF EXISTS assignments_delete ON public.classroom_assignments;

CREATE POLICY assignments_select ON public.classroom_assignments
  FOR SELECT
  USING (public.classroom_can_view(classroom_id));

CREATE POLICY assignments_insert ON public.classroom_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.classroom_can_manage(classroom_id));

CREATE POLICY assignments_update ON public.classroom_assignments
  FOR UPDATE
  TO authenticated
  USING (public.classroom_can_manage(classroom_id))
  WITH CHECK (public.classroom_can_manage(classroom_id));

CREATE POLICY assignments_delete ON public.classroom_assignments
  FOR DELETE
  TO authenticated
  USING (public.classroom_can_manage(classroom_id));

DROP POLICY IF EXISTS submissions_select ON public.assignment_submissions;
DROP POLICY IF EXISTS submissions_insert ON public.assignment_submissions;
DROP POLICY IF EXISTS submissions_update_instructor ON public.assignment_submissions;

CREATE POLICY submissions_select ON public.assignment_submissions
  FOR SELECT
  USING (
    student_id = auth.uid()
    OR public.classroom_assignment_can_manage(assignment_id)
  );

CREATE POLICY submissions_insert ON public.assignment_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND public.classroom_assignment_can_submit(assignment_id)
  );

CREATE POLICY submissions_update_instructor ON public.assignment_submissions
  FOR UPDATE
  TO authenticated
  USING (public.classroom_assignment_can_manage(assignment_id))
  WITH CHECK (public.classroom_assignment_can_manage(assignment_id));

DROP POLICY IF EXISTS classroom_activity_select ON public.classroom_activity;
DROP POLICY IF EXISTS classroom_activity_insert ON public.classroom_activity;

CREATE POLICY classroom_activity_select ON public.classroom_activity
  FOR SELECT
  USING (public.classroom_can_view(classroom_id));

CREATE POLICY classroom_activity_insert ON public.classroom_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.classroom_can_view(classroom_id)
  );

GRANT EXECUTE ON FUNCTION public.classroom_is_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.classroom_has_member_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.classroom_can_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.classroom_can_manage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.classroom_assignment_can_manage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.classroom_assignment_can_submit(uuid) TO authenticated;
