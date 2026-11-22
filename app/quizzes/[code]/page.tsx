import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isFreeQuiz, isQuizCode, quizSummary } from "@/lib/quiz";
import { getPublishedQuiz } from "@/lib/quiz-store";
import AbcQuizView from "./abc-quiz";
import FirstSightView from "./first-sight-quiz";
import QuizLocked from "./quiz-locked";
import { isSignedIn } from "../quiz-access";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

async function load(code: string) {
  if (!isQuizCode(code)) return null;
  try {
    return await getPublishedQuiz(code);
  } catch (error) {
    console.error("quiz_read_failed", error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const quiz = await load((await params).code);
  return { title: quiz ? `${quiz.title}｜心理測驗｜Zolacoco Tarot` : "心理測驗｜Zolacoco Tarot" };
}

export default async function QuizPage({ params }: Props) {
  const quiz = await load((await params).code);
  if (!quiz) notFound();
  // an older quiz, signed out: only its cover and title leave the server, never its readings
  if (!isFreeQuiz(quiz.publishAt) && !(await isSignedIn())) return <QuizLocked quiz={quizSummary(quiz)} />;
  return quiz.kind === "abc" ? <AbcQuizView quiz={quiz} /> : <FirstSightView quiz={quiz} />;
}
