
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Submission = {
  questionId: number;
  answerId: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || !Array.isArray(body.submissions)) {
      return NextResponse.json(
        { error: "Données de correction invalides." },
        { status: 400 }
      );
    }

    const submissions = body.submissions as Submission[];
    const moduleId = Number(body.moduleId);
    const durationSeconds = Number(body.durationSeconds ?? 0);

    if (
      !Number.isInteger(moduleId) ||
      moduleId <= 0 ||
      submissions.length === 0
    ) {
      return NextResponse.json(
        { error: "Module ou réponses invalides." },
        { status: 400 }
      );
    }

    const invalidSubmission = submissions.some(
      (item) =>
        !Number.isInteger(Number(item.questionId)) ||
        Number(item.questionId) <= 0 ||
        typeof item.answerId !== "string" ||
        !item.answerId.trim()
    );

    if (invalidSubmission) {
      return NextResponse.json(
        { error: "Une ou plusieurs réponses sont invalides." },
        { status: 400 }
      );
    }

    const questionIds = submissions.map((item) =>
      Number(item.questionId)
    );

    const uniqueQuestionIds = [...new Set(questionIds)];

    if (uniqueQuestionIds.length !== questionIds.length) {
      return NextResponse.json(
        { error: "Une question apparaît plusieurs fois." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Utilisateur non connecté." },
        { status: 401 }
      );
    }

    const { data: questions, error: questionsError } =
      await supabase
        .from("questions")
        .select(
          "id, question, explanation, options, correct_answer"
        )
        .in("id", uniqueQuestionIds)
        .eq("module_id", moduleId)
        .eq("status", "approved")
        .eq("is_validated", true);

    if (questionsError) {
      return NextResponse.json(
        { error: questionsError.message },
        { status: 500 }
      );
    }

    const questionMap = new Map(
      (questions ?? []).map((question) => [
        question.id,
        question,
      ])
    );

    let score = 0;

    const results = submissions.map((submission) => {
      const question = questionMap.get(
        Number(submission.questionId)
      );

      if (!question) {
        return {
          questionId: Number(submission.questionId),
          selectedAnswerId: submission.answerId,
          correctAnswerId: null,
          isCorrect: false,
          explanation: "Cette question n'est plus disponible.",
        };
      }

      const options = Array.isArray(question.options)
        ? question.options
        : [];

      const selectedLabel = submission.answerId.split("-").pop();

      const selectedOption = options.find(
        (option: { label?: string }) =>
          option.label === selectedLabel
      );

      const correctOption = options.find(
        (option: { label?: string }) =>
          option.label === question.correct_answer
      );

      const isCorrect =
        !!selectedOption &&
        !!correctOption &&
        selectedOption.label === correctOption.label;

      if (isCorrect) score++;

      return {
        questionId: question.id,
        selectedAnswerId: submission.answerId,
        correctAnswerId: correctOption
          ? `${question.id}-${correctOption.label}`
          : null,
        isCorrect,
        explanation: question.explanation ?? null,
      };
    });

    const total = submissions.length;
    const percentage = Math.round((score / total) * 100);

    const savedQuestionIds = Array.isArray(body.questionIds)
      ? body.questionIds
          .map((id: unknown) => Number(id))
          .filter((id: number) => Number.isInteger(id) && id > 0)
      : uniqueQuestionIds;

    const wrongQuestionIds = results
      .filter((result) => !result.isCorrect)
      .map((result) => result.questionId);

    const { error: attemptError } = await supabase
      .from("qcm_attempts")
      .insert({
        user_id: user.id,
        module_id: moduleId,
        score,
        total,
        percentage,
        question_ids: savedQuestionIds,
        wrong_question_ids: wrongQuestionIds,
        duration_seconds:
          Number.isFinite(durationSeconds) && durationSeconds >= 0
            ? Math.round(durationSeconds)
            : 0,
      });

    if (attemptError) {
      console.error("Erreur enregistrement tentative :", attemptError);

      return NextResponse.json(
        {
          error:
            "Le QCM a été corrigé, mais son résultat n'a pas pu être enregistré.",
          details: attemptError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      score,
      total,
      percentage,
      results,
    });
  } catch (error) {
    console.error("Erreur correction QCM :", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue.",
      },
      { status: 500 }
    );
  }
}
