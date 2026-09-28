import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type RouteContext = {
  params: Promise<{
    moduleId: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const params = await context.params;

    const moduleIdString =
      params?.moduleId;

    const moduleId = Number(
      moduleIdString
    );

    if (
      !moduleIdString ||
      !Number.isInteger(moduleId) ||
      moduleId <= 0
    ) {
      return NextResponse.json(
        {
          error: `Module invalide. Identifiant reçu : ${String(
            moduleIdString
          )}`,
        },
        { status: 400 }
      );
    }

    const url = new URL(
      request.url
    );

    const rawCount = Number(
      url.searchParams.get(
        "count"
      ) ?? "10"
    );

    const count = [10, 20, 30].includes(
      rawCount
    )
      ? rawCount
      : 10;

    const {
      data: module,
      error: moduleError,
    } = await supabase
      .from("modules")
      .select(
        "id, name, description"
      )
      .eq("id", moduleId)
      .single();

    if (
      moduleError ||
      !module
    ) {
      return NextResponse.json(
        {
          error:
            moduleError?.message ??
            "Module introuvable.",
        },
        { status: 404 }
      );
    }

    const {
      data: questions,
      error: questionsError,
    } = await supabase
      .from("questions")
      .select(
        `
        id,
        question,
        answers (
          id,
          answer,
          is_correct
        )
        `
      )
      .eq(
        "module_id",
        moduleId
      )
      .eq(
        "status",
        "approved"
      );

    if (questionsError) {
      return NextResponse.json(
        {
          error:
            questionsError.message,
        },
        { status: 500 }
      );
    }

    const validQuestions = (
      questions ?? []
    ).filter((question) => {
      const answers =
        question.answers ??
        [];

      const correctCount =
        answers.filter(
          (answer) =>
            answer.is_correct ===
            true
        ).length;

      const uniqueAnswers =
        new Set(
          answers.map(
            (answer) =>
              answer.answer
                .trim()
                .toLowerCase()
          )
        );

      return (
        answers.length === 3 &&
        correctCount === 1 &&
        uniqueAnswers.size === 3
      );
    });

    const shuffledQuestions =
      [...validQuestions].sort(
        () =>
          Math.random() -
          0.5
      );

    const selectedQuestions =
      shuffledQuestions
        .slice(0, count)
        .map((question) => ({
          id: question.id,
          question:
            question.question,
          answers: [
            ...(question.answers ??
              []),
          ]
            .sort(
              () =>
                Math.random() -
                0.5
            )
            .map(
              ({
                id,
                answer,
              }) => ({
                id,
                answer,
              })
            ),
        }));

    return NextResponse.json({
      module,
      availableCount:
        validQuestions.length,
      requestedCount: count,
      questions:
        selectedQuestions,
    });
  } catch (error) {
    console.error(
      "Erreur API QCM :",
      error
    );

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