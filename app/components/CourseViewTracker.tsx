"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  courseId: number;
};

export default function CourseViewTracker({
  courseId,
}: Props) {
  useEffect(() => {
    async function track() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      await supabase.from("course_views").insert({
        user_id: user.id,
        course_id: courseId,
      });
    }

    track();
  }, [courseId]);

  return null;
}