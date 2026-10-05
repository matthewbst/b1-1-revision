import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const moduleId = Number(body.moduleId);
    const durationSeconds = Number(body.durationSeconds ?? 0);

    const questionIdsFromBody = Array.isArray(body.questionIds)
      ? body.questionIds
          .map((id: unknown) => Number(id))
          .filter(
            (id: number) => Number.isInteger(id) && id > 0
          )
      : [];

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

    if (!Number.isInteger(moduleId) || moduleId <= 0) {
      return NextResponse.json(
        {
          error: "Module invalide.",
        },
        { status: 400 }
      );
    }

    /*
     * Client Supabase serveur :
     * permet de récupérer l'utilisateur connecté
     * à partir des cookies de session.
     */
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(
        "Erreur récupération utilisateur :",
        userError
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "Utilisateur non connecté.",
        },
        { status: 401 }
      );
    }

    /*
     * Récupération des questions et des réponses.
     */
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

    /*
     * Toutes les questions du QCM.
     */
    const savedQuestionIds =
      questionIdsFromBody.length > 0
        ? questionIdsFromBody
        : uniqueQuestionIds;

    /*
     * Questions auxquelles l'utilisateur a donné
     * une mauvaise réponse.
     */
    const wrongQuestionIds = results
      .filter((result) => !result.correct)
      .map((result) => result.questionId);

    /*
     * Enregistrement de la tentative.
     */
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
          Number.isFinite(durationSeconds) &&
          durationSeconds >= 0
            ? Math.round(durationSeconds)
            : 0,
      });

    if (attemptError) {
      console.error(
        "Erreur enregistrement qcm_attempts :",
        attemptError
      );

      return NextResponse.json(
        {
          error:
            "Le QCM a été corrigé, mais son résultat n'a pas pu être enregistré.",
          details: attemptError.message,
        },
        { status: 500 }
      );
    }

    /*
     * Retour du résultat au QCM.
     */
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