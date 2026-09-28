import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type Submission = {
  questionId: number;
  answerId: number;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || !Array.isArray(body.submissions)) {
      return NextResponse.json(
        {
          error: "Données de correction invalides.",
        },
        { status: 400 }
      );
    }

    const submissions = body.submissions as Submission[];

    if (submissions.length === 0) {
      return NextResponse.json(
        {
          error: "Aucune réponse à corriger.",
        },
        { status: 400 }
      );
    }

    const questionIds = submissions.map(
      (submission) => Number(submission.questionId)
    );

    const answerIds = submissions.map(
      (submission) => Number(submission.answerId)
    );

    const hasInvalidIds =
      questionIds.some(
        (id) => !Number.isInteger(id) || id <= 0
      ) ||
      answerIds.some(
        (id) => !Number.isInteger(id) || id <= 0
      );

    if (hasInvalidIds) {
      return NextResponse.json(
        {
          error: "Une ou plusieurs réponses sont invalides.",
        },
        { status: 400 }
      );
    }

    const uniqueQuestionIds = [...new Set(questionIds)];

    if (uniqueQuestionIds.length !== questionIds.length) {
      return NextResponse.json(
        {
          error: "Une question apparaît plusieurs fois.",
        },
        { status: 400 }
      );
    }

    const { data: questions, error: questionsError } =
      await supabase
        .from("questions")
        .select(
          `
          id,
          question,
          explanation,
          status,
          answers (
            id,
            answer,
            is_correct,
            question_id
          )
        `
        )
        .in("id", uniqueQuestionIds)
        .eq("status", "approved");

    if (questionsError) {
      return NextResponse.json(
        {
          error: questionsError.message,
        },
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
        submission.questionId
      );

      if (!question) {
        return {
          questionId: submission.questionId,
          selectedAnswerId: submission.answerId,
          correctAnswerId: 0,
          correct: false,
          explanation:
            "Cette question n'est plus disponible.",
        };
      }

      const answers = question.answers ?? [];

      const selectedAnswer = answers.find(
        (answer) =>
          answer.id === submission.answerId
      );

      const correctAnswer = answers.find(
        (answer) => answer.is_correct === true
      );

      const isCorrect =
        !!selectedAnswer &&
        !!correctAnswer &&
        selectedAnswer.id === correctAnswer.id;

      if (isCorrect) {
        score++;
      }

      return {
        questionId: question.id,
        selectedAnswerId: submission.answerId,
        correctAnswerId: correctAnswer?.id ?? 0,
        correct: isCorrect,
        explanation: question.explanation ?? null,
      };
    });

    const total = submissions.length;

    const percentage =
      total > 0
        ? Math.round((score / total) * 100)
        : 0;

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