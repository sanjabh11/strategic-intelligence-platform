-- Complete classroom workflow policies for memberships, assignments, submissions, and activity

ALTER TABLE public.classroom_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS members_insert ON public.classroom_members;
CREATE POLICY members_insert ON public.classroom_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.classrooms c
      WHERE c.id = classroom_id
        AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.classroom_members cm
      WHERE cm.classroom_id = classroom_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('instructor', 'ta')
    )
  );

DROP POLICY IF EXISTS members_update ON public.classroom_members;
CREATE POLICY members_update ON public.classroom_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.classrooms c
      WHERE c.id = classroom_id
        AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.classroom_members cm
      WHERE cm.classroom_id = classroom_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('instructor', 'ta')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.classrooms c
      WHERE c.id = classroom_id
        AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.classroom_members cm
      WHERE cm.classroom_id = classroom_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('instructor', 'ta')
    )
  );

DROP POLICY IF EXISTS assignments_insert ON public.classroom_assignments;
CREATE POLICY assignments_insert ON public.classroom_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.classrooms c
      WHERE c.id = classroom_id
        AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.classroom_members cm
      WHERE cm.classroom_id = classroom_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('instructor', 'ta')
    )
  );

DROP POLICY IF EXISTS assignments_update ON public.classroom_assignments;
CREATE POLICY assignments_update ON public.classroom_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.classrooms c
      WHERE c.id = classroom_id
        AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.classroom_members cm
      WHERE cm.classroom_id = classroom_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('instructor', 'ta')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.classrooms c
      WHERE c.id = classroom_id
        AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.classroom_members cm
      WHERE cm.classroom_id = classroom_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('instructor', 'ta')
    )
  );

DROP POLICY IF EXISTS assignments_delete ON public.classroom_assignments;
CREATE POLICY assignments_delete ON public.classroom_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.classrooms c
      WHERE c.id = classroom_id
        AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.classroom_members cm
      WHERE cm.classroom_id = classroom_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('instructor', 'ta')
    )
  );

DROP POLICY IF EXISTS submissions_insert ON public.assignment_submissions;
CREATE POLICY submissions_insert ON public.assignment_submissions
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.classroom_assignments ca
      JOIN public.classroom_members cm
        ON cm.classroom_id = ca.classroom_id
      WHERE ca.id = assignment_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('student', 'instructor', 'ta')
    )
  );

DROP POLICY IF EXISTS submissions_update_instructor ON public.assignment_submissions;
CREATE POLICY submissions_update_instructor ON public.assignment_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.classroom_assignments ca
      JOIN public.classrooms c
        ON c.id = ca.classroom_id
      LEFT JOIN public.classroom_members cm
        ON cm.classroom_id = ca.classroom_id
       AND cm.user_id = auth.uid()
      WHERE ca.id = assignment_id
        AND (
          c.owner_id = auth.uid()
          OR cm.role IN ('instructor', 'ta')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.classroom_assignments ca
      JOIN public.classrooms c
        ON c.id = ca.classroom_id
      LEFT JOIN public.classroom_members cm
        ON cm.classroom_id = ca.classroom_id
       AND cm.user_id = auth.uid()
      WHERE ca.id = assignment_id
        AND (
          c.owner_id = auth.uid()
          OR cm.role IN ('instructor', 'ta')
        )
    )
  );

DROP POLICY IF EXISTS classroom_activity_select ON public.classroom_activity;
CREATE POLICY classroom_activity_select ON public.classroom_activity
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.classrooms c
      WHERE c.id = classroom_id
        AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.classroom_members cm
      WHERE cm.classroom_id = classroom_id
        AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS classroom_activity_insert ON public.classroom_activity;
CREATE POLICY classroom_activity_insert ON public.classroom_activity
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.classrooms c
        WHERE c.id = classroom_id
          AND c.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.classroom_members cm
        WHERE cm.classroom_id = classroom_id
          AND cm.user_id = auth.uid()
      )
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.classroom_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.assignment_submissions TO authenticated;
GRANT SELECT, INSERT ON public.classroom_activity TO authenticated;
