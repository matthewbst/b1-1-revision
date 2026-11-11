
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
    const moduleId = Number(params.moduleId);

    if (!Number.isInteger(moduleId) || moduleId <= 0) {
      return NextResponse.json(
        { error: "Module invalide." },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const rawCount = Number(url.searchParams.get("count") ?? "10");
    const count = [10, 20, 30].includes(rawCount) ? rawCount : 10;

    const { data: module, error: moduleError } = await supabase
      .from("modules")
      .select("id, name, description")
      .eq("id", moduleId)
      .single();

    if (moduleError || !module) {
      return NextResponse.json(
        { error: moduleError?.message ?? "Module introuvable." },
        { status: 404 }
      );
    }

    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("id, question, options, correct_answer")
      .eq("module_id", moduleId)
      .eq("status", "approved")
      .eq("is_validated", true);

    if (questionsError) {
      return NextResponse.json(
        { error: questionsError.message },
        { status: 500 }
      );
    }

    const validQuestions = (questions ?? [])
      .map((question) => {
        const options = Array.isArray(question.options)
          ? question.options
          : [];

        const correctOption = options.find(
          (option: { label?: string; text?: string }) =>
            option.label === question.correct_answer
        );

        if (
          options.length !== 3 ||
          !correctOption ||
          options.some(
            (option: { text?: string }) =>
              typeof option.text !== "string" || !option.text.trim()
          )
        ) {
          return null;
        }

        const uniqueAnswers = new Set(
          options.map(
            (option: { text: string }) =>
              option.text.trim().toLowerCase()
          )
        );

        if (uniqueAnswers.size !== 3) return null;

        return {
          id: question.id,
          question: question.question,
          answers: options.map(
            (option: { label: string; text: string }) => ({
              id: `${question.id}-${option.label}`,
              answer: option.text,
              is_correct: option.label === question.correct_answer,
            })
          ),
        };
      })
      .filter((question) => question !== null);

    const shuffledQuestions = [...validQuestions].sort(
      () => Math.random() - 0.5
    );

    const selectedQuestions = shuffledQuestions
      .slice(0, count)
      .map((question) => ({
        id: question.id,
        question: question.question,
        answers: [...question.answers]
          .sort(() => Math.random() - 0.5)
          .map(({ id, answer }) => ({ id, answer })),
      }));

    return NextResponse.json({
      module,
      availableCount: validQuestions.length,
      requestedCount: count,
      questions: selectedQuestions,
    });
  } catch (error) {
    console.error("Erreur API QCM :", error);

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
