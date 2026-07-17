DROP POLICY IF EXISTS classrooms_select ON public.classrooms;

CREATE POLICY classrooms_select ON public.classrooms
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR public.classroom_can_view(id)
  );
