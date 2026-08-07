import { Plus, Trash2, User, Mail, Phone, Lock } from 'lucide-react';

const QUESTION_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'select', label: 'Multiple Choice' },
  { value: 'yes_no', label: 'Yes / No' },
];

export default function CustomQuestionBuilder({ questions, onChange }) {
  const addQuestion = () => {
    if (questions.length >= 5) return;
    onChange([
      ...questions,
      {
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        label: '',
        type: 'text',
        options: [],
        required: false,
      },
    ]);
  };

  const removeQuestion = (index) => onChange(questions.filter((_, i) => i !== index));

  const updateQuestion = (index, field, value) =>
    onChange(questions.map((q, i) => (i === index ? { ...q, [field]: value } : q)));

  // ✅ NEW — switching a question TO "Multiple Choice" seeds it with 2 empty
  // option slots so the organizer sees the add-option UI immediately,
  // instead of an empty box with nothing to click
  const updateQuestionType = (index, newType) => {
    onChange(questions.map((q, i) => {
      if (i !== index) return q;
      const options = newType === 'select' && q.options.length === 0
        ? ['', '']
        : q.options;
      return { ...q, type: newType, options };
    }));
  };

  const addOption = (qIndex) => {
    onChange(questions.map((q, i) =>
      i === qIndex ? { ...q, options: [...q.options, ''] } : q
    ));
  };

  const updateOption = (qIndex, optIndex, value) => {
    onChange(questions.map((q, i) =>
      i === qIndex
        ? { ...q, options: q.options.map((o, oi) => (oi === optIndex ? value : o)) }
        : q
    ));
  };

  const removeOption = (qIndex, optIndex) => {
    onChange(questions.map((q, i) =>
      i === qIndex ? { ...q, options: q.options.filter((_, oi) => oi !== optIndex) } : q
    ));
  };

  return (
    <div className="space-y-4">
      {/* ✅ NEW — visual mock-up of the always-collected fields, so
          organizers SEE the form rather than read a sentence about it.
          Shown as locked/disabled-looking inputs, exactly like the real
          registration form's first 3 fields. */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
          <Lock size={11} /> Every registration form always starts with these — you don't need to add them:
        </p>
        <div className="space-y-2 bg-gray-100 border border-gray-200 rounded-xl p-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 opacity-70">
            <User size={14} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-500">Full Name</span>
            <span className="text-red-400 text-xs ml-auto">*</span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 opacity-70">
            <Mail size={14} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-500">Email Address</span>
            <span className="text-red-400 text-xs ml-auto">*</span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 opacity-70">
            <Phone size={14} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-500">Phone Number</span>
            <span className="text-red-400 text-xs ml-auto">*</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Anything you add below shows up <span className="font-semibold text-gray-500">after</span> these three, on the same form.
        </p>
      </div>

      {questions.length === 0 && (
        <button type="button" onClick={addQuestion}
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-cyan-300 rounded-xl text-sm font-semibold text-cyan-600 hover:bg-cyan-50 hover:border-cyan-500 transition">
          <Plus size={16} /> Add Question
        </button>
      )}

      {questions.map((q, index) => (
        <div key={q.id} className="border-2 border-gray-100 rounded-xl p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-600">Question {index + 1}</span>
            <button type="button" onClick={() => removeQuestion(index)}
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
              <Trash2 size={14} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Question Text</label>
              <input type="text" value={q.label}
                onChange={(e) => updateQuestion(index, 'label', e.target.value)}
                placeholder="Type your question"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Answer Type</label>
                <select value={q.type}
                  onChange={(e) => updateQuestionType(index, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 outline-none">
                  {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={q.required}
                    onChange={(e) => updateQuestion(index, 'required', e.target.checked)}
                    className="w-4 h-4 text-cyan-500 border-gray-300 rounded" />
                  <span className="text-xs font-medium text-gray-600">Required</span>
                </label>
              </div>
            </div>

            {q.type === 'select' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Answer Options</label>
                <div className="space-y-2">
                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {String.fromCharCode(65 + optIndex)}
                      </span>
                      <input type="text" value={opt}
                        onChange={(e) => updateOption(index, optIndex, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 outline-none" />
                      {q.options.length > 1 && (
                        <button type="button" onClick={() => removeOption(index, optIndex)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addOption(index)}
                  className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-cyan-600 hover:text-cyan-700 transition">
                  <Plus size={13} /> Add Option
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {questions.length > 0 && questions.length < 5 && (
        <button type="button" onClick={addQuestion}
          className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-cyan-300 rounded-xl text-sm font-semibold text-cyan-600 hover:bg-cyan-50 hover:border-cyan-500 transition">
          <Plus size={16} /> Add Question ({questions.length}/5)
        </button>
      )}
      {questions.length >= 5 && (
        <p className="text-center text-xs text-gray-400 py-1">Maximum 5 questions reached</p>
      )}
    </div>
  );
}