const MODELS = [
  {
    value: 'whisper',
    label: 'Whisper + GPT-4o',
    provider: 'OpenAI',
    description: 'Transcribes with whisper-1, evaluates with GPT-4o',
    limit: '25 MB audio limit',
    accentBorder: 'border-emerald-600',
    accentBg: 'bg-emerald-950/30',
    accentDot: 'bg-emerald-500 border-emerald-500',
    badge: 'bg-emerald-900/60 text-emerald-300',
    emoji: '🔊',
  },
  {
    value: 'gemini',
    label: 'Gemini 1.5 Pro',
    provider: 'Google',
    description: 'Analyzes audio + transcript simultaneously',
    limit: '~100 MB inline limit',
    accentBorder: 'border-blue-600',
    accentBg: 'bg-blue-950/30',
    accentDot: 'bg-blue-500 border-blue-500',
    badge: 'bg-blue-900/60 text-blue-300',
    emoji: '✨',
  },
];

export default function ModelSelector({ model, onChange }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col">
      <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
        </svg>
        Select Model
      </h2>
      <div className="space-y-3 flex-1">
        {MODELS.map((opt) => {
          const isSelected = model === opt.value;
          return (
            <label
              key={opt.value}
              className={`block cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${
                isSelected ? `${opt.accentBorder} ${opt.accentBg}` : 'border-gray-700 bg-gray-800/40 hover:border-gray-600'
              }`}
            >
              <input
                type="radio"
                name="model"
                value={opt.value}
                checked={isSelected}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <div className="flex items-start gap-3">
                <span className="text-xl leading-none mt-0.5 flex-shrink-0">{opt.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm">{opt.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${opt.badge}`}>
                      {opt.provider}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{opt.description}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{opt.limit}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-all ${
                  isSelected ? opt.accentDot : 'border-gray-600 bg-transparent'
                }`} />
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
