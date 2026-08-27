const TYPE_LABELS = {
  mcq: 'MCQ', short: 'Short Answer', long: 'Long Answer',
  case_based: 'Case Based', assertion_reason: 'Assertion-Reason'
};

export default function QuestionRow({ question: q, showAnswer }) {
  const flags = [...(q.repeat_flags_1 || []), ...(q.repeat_flags_2 || [])];
  const isRepeat = flags.some(f => f.admin_verdict === 'confirmed');
  const isPending = flags.some(f => f.admin_verdict === 'pending');

  return (
    <div className={`question-row${isRepeat ? ' is-repeat' : ''}`}>
      <div className="question-row-header">
        <span className="q-number">Q{q.question_number}</span>
        {q.marks && <span className="q-marks">[{q.marks} {q.marks === 1 ? 'mark' : 'marks'}]</span>}
        {q.question_type && <span className="badge badge-neutral">{TYPE_LABELS[q.question_type] || q.question_type}</span>}
        {q.topics && (
          <span className="badge badge-primary">{q.topics.chapter_name}</span>
        )}
        {isRepeat && <span className="badge badge-danger">Repeated</span>}
        {!isRepeat && isPending && <span className="badge badge-warning">Possible Repeat</span>}
      </div>
      {q.question_text && <p className="question-row-text">{q.question_text}</p>}
      {showAnswer && q.answer_text && (
        <div className="question-row-answer"><strong>Answer: </strong>{q.answer_text}</div>
      )}
    </div>
  );
}
