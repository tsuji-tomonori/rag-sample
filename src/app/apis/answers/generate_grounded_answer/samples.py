from app.apis.answers.generate_grounded_answer.schemas import AnswerIn, AnswerOut, Citation

ANSWER_REQUEST_SAMPLE = AnswerIn(question="What are the support hours?", top_k=5)
ANSWER_RESPONSE_SAMPLE = AnswerOut(
    status="answered",
    answer="Support hours are weekdays from 09:00 to 17:00.",
    citations=[
        Citation(
            document_id="support-policy",
            chunk_id="support-policy:1:0",
            title="Support Policy",
            source_text="Support hours are weekdays from 09:00 to 17:00.",
            rank=1,
            score=0.0328,
        )
    ],
    request_id="request-003",
)
