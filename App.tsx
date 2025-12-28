import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateMathQuestions } from './services/geminiService';
import { Difficulty, Grade, Question, QuizConfig, QuizState, QuestionType, UserAnswer } from './types';
import MathRenderer from './components/MathRenderer';
import LoadingScreen from './components/LoadingScreen';
import { 
  BookOpen, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Award,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  AlertOctagon,
  CheckSquare,
  Square
} from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<'setup' | 'loading' | 'quiz' | 'summary'>('setup');
  
  const [config, setConfig] = useState<QuizConfig>({
    grade: Grade.NINE,
    topic: 'Phương trình bậc hai',
    difficulty: Difficulty.MEDIUM,
    questionCount: 5,
    questionType: 'MIXED'
  });

  const [quizState, setQuizState] = useState<QuizState>({
    questions: [],
    userAnswers: [],
    currentQuestionIndex: 0,
    isComplete: false,
    score: 0,
    warnings: 0,
    startTime: 0,
    submissionReason: 'normal'
  });
  
  const timerRef = useRef<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const handleStartQuiz = async () => {
    setView('loading');
    try {
      const questions = await generateMathQuestions(
        config.grade,
        config.topic,
        config.difficulty,
        config.questionCount,
        config.questionType
      );
      
      const initialAnswers = questions.map(q => {
        if (q.type === QuestionType.TRUE_FALSE) {
          return [undefined, undefined, undefined, undefined] as any;
        }
        return -1; 
      });

      setQuizState({
        questions,
        userAnswers: initialAnswers,
        currentQuestionIndex: 0,
        isComplete: false,
        score: 0,
        warnings: 0,
        startTime: Date.now(),
        submissionReason: 'normal'
      });
      setElapsedTime(0);
      setView('quiz');
    } catch (error) {
      alert("Có lỗi xảy ra khi tạo câu hỏi. Vui lòng thử lại.");
      setView('setup');
    }
  };

  const handleMCSelect = (optionIndex: number) => {
    if (quizState.isComplete) return;
    setQuizState(prev => {
      const newAnswers = [...prev.userAnswers];
      newAnswers[prev.currentQuestionIndex] = optionIndex;
      return { ...prev, userAnswers: newAnswers };
    });
  };

  const handleTFSelect = (propIndex: number, value: boolean) => {
    if (quizState.isComplete) return;
    setQuizState(prev => {
      const newAnswers = [...prev.userAnswers];
      const currentAns = newAnswers[prev.currentQuestionIndex] as boolean[] || [undefined, undefined, undefined, undefined];
      const updatedTF = [...currentAns];
      updatedTF[propIndex] = value;
      newAnswers[prev.currentQuestionIndex] = updatedTF;
      return { ...prev, userAnswers: newAnswers };
    });
  };

  const handleNextQuestion = () => {
    if (quizState.currentQuestionIndex < quizState.questions.length - 1) {
      setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }));
    } else {
      finishQuiz('normal');
    }
  };

  const handlePrevQuestion = () => {
    if (quizState.currentQuestionIndex > 0) {
      setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex - 1 }));
    }
  };

  const finishQuiz = useCallback((reason: 'normal' | 'cheat' = 'normal') => {
    setQuizState(prev => {
      let totalPoints = 0;
      const maxPossiblePoints = prev.questions.length; 

      prev.questions.forEach((q, idx) => {
        const ans = prev.userAnswers[idx];
        if (q.type === QuestionType.MULTIPLE_CHOICE) {
          if (ans === q.correctAnswerIndex) {
            totalPoints += 1;
          }
        } else if (q.type === QuestionType.TRUE_FALSE) {
          const userTF = ans as boolean[];
          const correctTF = q.correctAnswersTF || [];
          let correctProps = 0;
          if (Array.isArray(userTF)) {
             userTF.forEach((val, i) => {
               if (val === correctTF[i]) correctProps++;
             });
          }
          totalPoints += (correctProps * 0.25);
        }
      });
      
      const finalScore = (totalPoints / maxPossiblePoints) * 10;

      return {
        ...prev,
        isComplete: true,
        score: parseFloat(finalScore.toFixed(2)),
        endTime: Date.now(),
        submissionReason: reason
      };
    });
    setView('summary');
  }, []);

  const resetApp = () => {
    setView('setup');
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && view === 'quiz') {
        finishQuiz('cheat');
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [view, finishQuiz]);

  useEffect(() => {
    if (view === 'quiz' && !quizState.isComplete) {
      timerRef.current = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [view, quizState.isComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- RENDERERS ---

  const renderSetup = () => (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-xl border-t-4 border-teal-500">
      <div className="text-center mb-8">
        <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="text-teal-600 w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-teal-900">MathGenius THCS</h1>
        <p className="text-gray-500 mt-2">Hệ thống ôn luyện Toán thông minh</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Khối Lớp</label>
          <div className="grid grid-cols-4 gap-2">
            {Object.values(Grade).map((g) => (
              <button
                key={g}
                onClick={() => setConfig({ ...config, grade: g })}
                className={`py-2 rounded-lg border font-medium transition-colors ${
                  config.grade === g 
                  ? 'bg-teal-600 text-white border-teal-600' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-teal-50'
                }`}
              >
                Lớp {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Chủ đề bài học</label>
          <input
            type="text"
            value={config.topic}
            onChange={(e) => setConfig({ ...config, topic: e.target.value })}
            placeholder="Ví dụ: Hình bình hành..."
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Độ khó</label>
            <select
              value={config.difficulty}
              onChange={(e) => setConfig({ ...config, difficulty: e.target.value as Difficulty })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none"
            >
              {Object.values(Difficulty).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">Loại câu hỏi</label>
             <select
                value={config.questionType}
                onChange={(e) => setConfig({ ...config, questionType: e.target.value as any })}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none"
             >
               <option value="MIXED">Kết hợp</option>
               <option value={QuestionType.MULTIPLE_CHOICE}>Trắc nghiệm (4 đáp án)</option>
               <option value={QuestionType.TRUE_FALSE}>Đúng/Sai (4 ý)</option>
             </select>
          </div>
        </div>

        <button
          onClick={handleStartQuiz}
          disabled={!config.topic.trim()}
          className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-teal-700 transition-transform active:scale-[0.98] shadow-lg shadow-teal-200"
        >
          Bắt đầu làm bài
        </button>
      </div>
    </div>
  );

  const renderMCQuestion = (q: Question) => {
    const selected = quizState.userAnswers[quizState.currentQuestionIndex] as number;
    const labels = ['A', 'B', 'C', 'D'];
    
    return (
      <div className="space-y-3">
        {q.options?.map((option, idx) => {
          const isSelected = selected === idx;
          return (
            <button
              key={idx}
              onClick={() => handleMCSelect(idx)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center group
                ${isSelected 
                  ? 'border-teal-500 bg-teal-50 shadow-md' 
                  : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
                }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 border font-bold transition-colors shrink-0
                ${isSelected ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-gray-500 border-gray-300 group-hover:border-teal-400'}`}>
                {labels[idx]}
              </div>
              <div className="text-gray-800 flex-1">
                 {/* Removed redundant A:, B: prefix span here */}
                 <MathRenderer content={option} className="inline text-lg" />
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderTFQuestion = (q: Question) => {
    const currentAns = (quizState.userAnswers[quizState.currentQuestionIndex] as boolean[]) || [undefined, undefined, undefined, undefined];
    const labels = ['a', 'b', 'c', 'd'];

    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 p-3 font-bold text-gray-600 border-b">
          <div className="col-span-8 pl-4">Mệnh đề</div>
          <div className="col-span-2 text-center">Đúng</div>
          <div className="col-span-2 text-center">Sai</div>
        </div>
        {q.propositions?.map((prop, idx) => (
           <div key={idx} className={`grid grid-cols-12 p-4 items-center border-b last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
             <div className="col-span-8 flex items-start pr-4">
                <span className="font-bold mr-2 bg-gray-200 rounded px-2 text-sm h-6 flex items-center">{labels[idx]}</span>
                <MathRenderer content={prop} className="text-gray-800 text-lg" />
             </div>
             
             <div className="col-span-2 flex justify-center">
                <button
                  onClick={() => handleTFSelect(idx, true)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 transition-all
                    ${currentAns[idx] === true 
                      ? 'bg-teal-500 border-teal-500 text-white' 
                      : 'border-gray-300 text-gray-300 hover:border-teal-400'}`}
                >
                  <CheckSquare className="w-6 h-6" />
                </button>
             </div>
             
             <div className="col-span-2 flex justify-center">
               <button
                  onClick={() => handleTFSelect(idx, false)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 transition-all
                    ${currentAns[idx] === false 
                      ? 'bg-red-500 border-red-500 text-white' 
                      : 'border-gray-300 text-gray-300 hover:border-red-400'}`}
                >
                  <XCircle className="w-6 h-6" />
                </button>
             </div>
           </div>
        ))}
      </div>
    );
  };

  const renderQuiz = () => {
    const currentQ = quizState.questions[quizState.currentQuestionIndex];
    const isLast = quizState.currentQuestionIndex === quizState.questions.length - 1;
    
    const answeredCount = quizState.userAnswers.filter(a => {
        if (Array.isArray(a)) return a.some(v => v !== undefined);
        return a !== -1;
    }).length;
    const progress = (answeredCount / quizState.questions.length) * 100;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex justify-between items-center sticky top-4 z-10 border-l-4 border-teal-500">
           <div className="flex items-center gap-4">
             <div className="flex flex-col">
               <span className="text-xs font-bold text-gray-400 uppercase">Thời gian</span>
               <span className="text-xl font-mono text-teal-700 font-bold">{formatTime(elapsedTime)}</span>
             </div>
             <div className="h-8 w-px bg-gray-200"></div>
             <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">
               {currentQ.type === QuestionType.TRUE_FALSE ? 'Đúng / Sai' : 'Trắc nghiệm'}
             </span>
           </div>
           <span className="text-sm font-medium text-gray-600">
             Câu {quizState.currentQuestionIndex + 1}/{quizState.questions.length}
           </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
          <div className="bg-teal-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-lg mb-8">
           <div className="mb-6">
              <span className="bg-teal-100 text-teal-800 text-sm font-bold px-3 py-1 rounded-full mr-3 align-middle inline-block mb-1">
                Câu {quizState.currentQuestionIndex + 1}
              </span>
              <MathRenderer content={currentQ.questionText} className="text-xl font-medium text-gray-800 leading-relaxed" />
           </div>

           {currentQ.type === QuestionType.MULTIPLE_CHOICE 
             ? renderMCQuestion(currentQ) 
             : renderTFQuestion(currentQ)
           }
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevQuestion}
            disabled={quizState.currentQuestionIndex === 0}
            className="flex items-center px-6 py-3 rounded-lg font-medium text-gray-600 bg-white shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5 mr-2" /> Trước
          </button>

          {isLast ? (
            <button
              onClick={() => finishQuiz('normal')}
              className="flex items-center px-8 py-3 rounded-lg font-bold text-white bg-teal-600 shadow-lg shadow-teal-200 hover:bg-teal-700 hover:-translate-y-0.5 transition-all"
            >
              Nộp bài <CheckCircle className="w-5 h-5 ml-2" />
            </button>
          ) : (
             <button
              onClick={handleNextQuestion}
              className="flex items-center px-6 py-3 rounded-lg font-medium text-white bg-teal-600 shadow-md hover:bg-teal-700"
            >
              Tiếp theo <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {quizState.submissionReason === 'cheat' && (
           <div className="bg-red-600 text-white p-4 flex items-center justify-center gap-3">
             <AlertOctagon className="w-8 h-8" />
             <div className="text-center"><h3 className="font-bold">GIAN LẬN!</h3><p className="text-sm">Bài thi đã bị nộp tự động.</p></div>
           </div>
        )}
        <div className="bg-teal-600 p-8 text-center text-white">
          <div className="text-6xl font-bold mb-2">{quizState.score}<span className="text-2xl opacity-75">/10</span></div>
          <p>Chủ đề: {config.topic}</p>
        </div>

        <div className="p-8 space-y-8">
           {quizState.questions.map((q, idx) => {
             const ans = quizState.userAnswers[idx];
             let isCorrect = false;
             let borderColor = 'border-red-200 bg-red-50';
             let correctCountTF = 0;
             
             if (q.type === QuestionType.MULTIPLE_CHOICE) {
               if (ans === q.correctAnswerIndex) {
                 isCorrect = true;
                 borderColor = 'border-green-200 bg-green-50';
               }
             } else {
               const userTF = ans as boolean[];
               const keyTF = q.correctAnswersTF || [];
               userTF?.forEach((v, k) => { if (v === keyTF[k]) correctCountTF++; });
               if (correctCountTF === 4) {
                 isCorrect = true;
                 borderColor = 'border-green-200 bg-green-50';
               } else if (correctCountTF > 0) {
                 borderColor = 'border-orange-200 bg-orange-50';
               }
             }

             return (
               <div key={idx} className={`p-6 rounded-xl border ${borderColor}`}>
                 <div className="flex items-start gap-3 mb-4">
                   <div className="font-bold text-gray-700 mr-2 whitespace-nowrap">Câu {idx + 1}:</div>
                   <MathRenderer content={q.questionText} className="text-gray-800" />
                 </div>
                 
                 {q.type === QuestionType.MULTIPLE_CHOICE ? (
                    <div className="ml-0 md:ml-8 space-y-2">
                      {q.options?.map((opt, oIdx) => {
                        const isSelected = ans === oIdx;
                        const isKey = q.correctAnswerIndex === oIdx;
                        let style = "text-gray-600";
                        if (isKey) style = "font-bold text-green-700 bg-white border border-green-300 px-2 rounded";
                        if (isSelected && !isKey) style = "font-bold text-red-700 line-through decoration-red-400";
                        
                        return (
                          <div key={oIdx} className="flex items-center gap-2">
                            <span className="font-bold w-6">{String.fromCharCode(65+oIdx)}.</span>
                            <div className={style}><MathRenderer content={opt} className="inline"/></div>
                            {isKey && <CheckCircle className="w-4 h-4 text-green-600"/>}
                          </div>
                        )
                      })}
                    </div>
                 ) : (
                    <div className="ml-0 md:ml-8 bg-white rounded-lg border border-gray-200 overflow-hidden">
                      {q.propositions?.map((prop, pIdx) => {
                         const userVal = (ans as boolean[])?.[pIdx];
                         const keyVal = q.correctAnswersTF?.[pIdx];
                         const matched = userVal === keyVal;
                         
                         return (
                           <div key={pIdx} className="grid grid-cols-12 p-2 border-b last:border-0 items-center gap-2">
                             <div className="col-span-8 text-sm"><span className="font-bold mr-1">{String.fromCharCode(97+pIdx)})</span> <MathRenderer content={prop} className="inline"/></div>
                             <div className="col-span-4 flex items-center justify-end gap-2 text-xs">
                               <span className="text-gray-500">Bạn chọn: <b className={userVal ? 'text-blue-600' : 'text-red-600'}>{userVal === true ? 'Đ' : userVal === false ? 'S' : '-'}</b></span>
                               <span className="text-gray-500">Đ.Án: <b className={keyVal ? 'text-blue-600' : 'text-red-600'}>{keyVal ? 'Đ' : 'S'}</b></span>
                               {matched ? <CheckCircle className="w-4 h-4 text-green-500"/> : <XCircle className="w-4 h-4 text-red-500"/>}
                             </div>
                           </div>
                         )
                      })}
                    </div>
                 )}
                 
                 <div className="mt-4 p-3 bg-white/50 rounded border border-gray-200 text-sm">
                   <strong className="text-teal-700">Giải thích:</strong> <MathRenderer content={q.explanation} className="text-gray-600"/>
                 </div>
               </div>
             )
           })}
           
           <button onClick={resetApp} className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold text-lg hover:bg-teal-700 flex items-center justify-center gap-2">
             <RefreshCw className="w-5 h-5"/> Làm đề mới
           </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 py-12 px-4 sm:px-6">
      {view === 'setup' && renderSetup()}
      {view === 'loading' && <LoadingScreen />}
      {view === 'quiz' && renderQuiz()}
      {view === 'summary' && renderSummary()}
    </div>
  );
};

export default App;