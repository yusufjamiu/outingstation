import { Plus, Trash2, HelpCircle } from 'lucide-react';

const QUESTION_PRESETS = [
  { label: 'Dietary restrictions?', type: 'text' },
  { label: 'How did you hear about this event?', type: 'select', options: ['Instagram', 'Friend', 'OutingStation', 'Other'] },
  { label: 'Any special accommodations needed?', type: 'text' },
];

const QUESTION_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'select', label: 'Multiple Choice' },
  { value: 'yes_no', label: 'Yes / No' },
];

export default function CustomQuestionBuilder({ questions, onChange }) {
  const addQuestion = (preset = null) => {
    if (questions.length >= 5) return;
    onChange([
      ...questions,
      {
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        label: preset?.label || '',
        type: preset?.type || 'text',
        options: preset?.options || [],
        required: false,
      },
    ]);
  };

  const removeQuestion = (index) => onChange(questions.filter((_, i) => i !== index));

  const updateQuestion = (index, field, value) =>
    onChange(questions.map((q, i) => (i === index ? { ...q, [field]: value } : q)));

  const updateOptions = (index, rawText) => {
    const options = rawText.split(',').map(o => o.trim()).filter(Boolean);
    updateQuestion(index, 'options', options);
  };

  return (
    <div className="space-y-4">
      {questions.length === 0 && (
        <div className="text-center py-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <HelpCircle className="mx-auto text-gray-300 mb-2" size={28} />
          <p className="text-sm font-bold text-gray-700 mb-1">No custom questions yet</p>
          <p className="text-xs text-gray-400 mb-4">Ask attendees anything extra you need to know — dietary needs, how they heard about you, anything.</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {QUESTION_PRESETS.map((p, i) => (
              <button key={i} type="button" onClick={() => addQuestion(p)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:border-cyan-400 hover:text-cyan-600 transition">
                + {p.label}
              </button>
            ))}
          </div>
        </div>
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
                placeholder="e.g. Dietary restrictions?"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Answer Type</label>
                <select value={q.type}
                  onChange={(e) => updateQuestion(index, 'type', e.target.value)}
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
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Options <span className="text-gray-400">(comma separated)</span>
                </label>
                <input type="text" value={q.options.join(', ')}
                  onChange={(e) => updateOptions(index, e.target.value)}
                  placeholder="e.g. Instagram, Friend, OutingStation, Other"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 outline-none" />
              </div>
            )}
          </div>
        </div>
      ))}

      {questions.length > 0 && questions.length < 5 && (
        <button type="button" onClick={() => addQuestion()}
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