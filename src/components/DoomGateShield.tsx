import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, Lock, Brain, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { generateTriviaQuestion } from "../services/geminiService";
import { QuizQuestion } from "../types";

interface DoomGateShieldProps {
  isOpen: boolean;
  appName: string;
  onUnlockSuccess: () => void;
  onUnlockFail: (penalty: number) => void;
}

export default function DoomGateShield({ isOpen, appName, onUnlockSuccess, onUnlockFail }: DoomGateShieldProps) {
  const [quizMode, setQuizMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const startUnlockQuiz = async () => {
    setLoading(true);
    try {
      const q = await generateTriviaQuestion();
      setQuestion(q);
      setQuizMode(true);
    } catch (error) {
      console.error("Doom-Gate Quiz Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (index: number) => {
    if (!question) return;
    const isCorrect = index === question.correctAnswer;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    
    setTimeout(() => {
      if (isCorrect) {
        onUnlockSuccess();
        resetShield();
      } else {
        onUnlockFail(5);
        setFeedback(null);
        setQuestion(null);
        setQuizMode(false);
      }
    }, 1500);
  };

  const resetShield = () => {
    setQuizMode(false);
    setQuestion(null);
    setFeedback(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-cyber-black/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center"
        >
          {/* Glitchy Background Effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
            <motion.div 
              className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,0,0,0.1)_3px)]"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 0.1, repeat: Infinity }}
            />
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#ff0000_0%,transparent_70%)] opacity-20" />
          </div>

          {!quizMode ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-sm space-y-8 relative z-10"
            >
              <div className="relative inline-block">
                <motion.div 
                  className="absolute inset-0 bg-red-600 blur-3xl opacity-30"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <ShieldAlert className="w-24 h-24 text-red-500 relative z-10 mx-auto" />
              </div>

              <div className="space-y-2">
                <h1 className="text-4xl font-mono font-bold tracking-tighter text-red-500 drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]">DOOM-GATE ACTIVE</h1>
                <p className="text-white/60 font-mono text-sm uppercase tracking-widest">Access to <span className="text-white font-bold">{appName}</span> is Restricted</p>
              </div>

              <div className="glass-panel p-6 border-red-500/50 bg-red-500/5">
                <div className="flex items-center justify-center gap-2 mb-4 text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-xs font-mono uppercase font-bold">Neural Lockdown</span>
                </div>
                <p className="text-sm leading-relaxed mb-6 text-white/80">
                  Mindless scrolling detected. To bypass the gate, you must complete a neural verification challenge.
                </p>
                
                <button
                  onClick={startUnlockQuiz}
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-red-600 text-white font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(255,0,0,0.4)] hover:bg-red-500 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Brain className="w-5 h-5" />
                      Unlock with AI Quiz
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="max-w-md w-full glass-panel p-8 border-red-500/50 bg-red-500/5 relative z-10"
            >
              <div className="flex items-center gap-2 mb-6">
                <Brain className="w-5 h-5 text-red-500" />
                <h2 className="text-xs font-mono uppercase tracking-widest text-red-500">Neural Verification</h2>
              </div>

              {question && (
                <div className="space-y-6">
                  <p className="text-xl font-medium text-left leading-tight text-white">{question.question}</p>
                  
                  <div className="grid gap-3">
                    {question.options.map((option, i) => (
                      <button
                        key={i}
                        disabled={feedback !== null}
                        onClick={() => handleAnswer(i)}
                        className={`w-full p-4 rounded-xl text-left border transition-all ${
                          feedback === null 
                            ? "bg-white/5 border-white/10 hover:bg-white/10" 
                            : i === question.correctAnswer 
                              ? "bg-green-500/20 border-green-500 text-green-400"
                              : feedback === 'wrong' && i !== question.correctAnswer
                                ? "bg-red-500/20 border-red-500 text-red-400"
                                : "bg-white/5 border-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{option}</span>
                          {feedback !== null && i === question.correctAnswer && <CheckCircle2 className="w-5 h-5" />}
                          {feedback === 'wrong' && i !== question.correctAnswer && <XCircle className="w-5 h-5 opacity-0" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
