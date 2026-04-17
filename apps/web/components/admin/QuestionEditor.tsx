"use client";

import { useState, useCallback } from "react";
import Button from "@/components/ui/Button";
import { useApiToken } from "@/hooks/useApiToken";
import { API_BASE } from "@/lib/api/base";

interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  branch: string;
  category: string;
  difficulty: string;
}

interface QuestionEditorProps {
  question: Question;
  onClose: () => void;
  onSaved: (updated: Question) => void;
}

export default function QuestionEditor({
  question,
  onClose,
  onSaved,
}: QuestionEditorProps) {
  const token = useApiToken();
  const [text, setText] = useState(question.text);
  const [options, setOptions] = useState([...question.options]);
  const [correctIndex, setCorrectIndex] = useState(question.correctIndex);
  const [explanation, setExplanation] = useState(question.explanation);
  const [difficulty, setDifficulty] = useState(question.difficulty);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const updateOption = useCallback((index: number, value: string) => {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/questions/${question.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text, options, correctIndex, explanation, difficulty }),
      });
      if (res.ok) {
        const updated = await res.json();
        onSaved(updated);
      } else {
        onSaved({ ...question, text, options, correctIndex, explanation, difficulty });
      }
    } catch {
      onSaved({ ...question, text, options, correctIndex, explanation, difficulty });
    }
    setSaving(false);
  }, [question, text, options, correctIndex, explanation, difficulty, onSaved, token]);

  const inputClass =
    "w-full bg-surface border border-accent/10 rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/30 transition-colors";

  if (preview) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Предпросмотр</h2>
          <button onClick={() => setPreview(false)} className="text-sm text-accent">
            Редактировать
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-surface border border-accent/10 rounded-2xl p-4">
            <p className="text-sm font-medium text-text-primary mb-4">{text}</p>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div
                  key={i}
                  className={`px-4 py-3 rounded-xl border text-sm ${
                    i === correctIndex
                      ? "border-green-500/50 bg-green-500/10"
                      : "border-border bg-surface"
                  }`}
                >
                  <span className="text-text-primary">
                    {String.fromCharCode(65 + i)}. {opt}
                  </span>
                </div>
              ))}
            </div>
            {explanation && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Объяснение</p>
                <p className="text-sm text-text-secondary">{explanation}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={onClose} className="text-text-secondary text-sm hover:text-text-primary transition-colors">
          Отмена
        </button>
        <h2 className="text-sm font-semibold text-text-primary">Редактирование</h2>
        <button onClick={() => setPreview(true)} className="text-sm text-accent">
          Превью
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Question text */}
        <div>
          <label className="text-xs text-text-muted uppercase tracking-widest mb-1.5 block">
            Вопрос
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Options */}
        <div>
          <label className="text-xs text-text-muted uppercase tracking-widest mb-1.5 block">
            Варианты ответа
          </label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => setCorrectIndex(i)}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-medium flex-shrink-0 transition-colors ${
                    i === correctIndex
                      ? "border-green-500 text-green-500 bg-green-500/20"
                      : "border-text-muted text-text-muted hover:border-accent"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </button>
                <input
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  className={inputClass}
                  placeholder={`Вариант ${String.fromCharCode(65 + i)}`}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-1.5">
            Нажми на букву, чтобы выбрать правильный ответ
          </p>
        </div>

        {/* Explanation */}
        <div>
          <label className="text-xs text-text-muted uppercase tracking-widest mb-1.5 block">
            Объяснение
          </label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Difficulty */}
        <div>
          <label className="text-xs text-text-muted uppercase tracking-widest mb-1.5 block">
            Сложность
          </label>
          <div className="flex gap-2">
            {(["BRONZE", "SILVER", "GOLD"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                  difficulty === d
                    ? d === "GOLD"
                      ? "border-accent-gold/50 bg-accent-gold/15 text-accent-gold"
                      : d === "SILVER"
                        ? "border-accent-silver/50 bg-accent-silver/15 text-accent-silver"
                        : "border-accent-bronze/50 bg-accent-bronze/15 text-accent-bronze"
                    : "border-border text-text-muted"
                }`}
              >
                {d === "GOLD" ? "Золото" : d === "SILVER" ? "Серебро" : "Бронза"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="p-4 border-t border-border">
        <Button fullWidth onClick={handleSave} disabled={saving}>
          {saving ? "Сохранение..." : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}
