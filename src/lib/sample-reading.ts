import type { Reading, ReadingContent } from '../types';
const content: ReadingContent = {
  openingHook: 'You have a thoughtful mind and a quietly adventurous spirit.',
  majorHighlight: 'A thoughtful mind. An independent spirit.',
  executiveSummary: 'This example explores how a palm reading can become a starting point for reflection. In traditional palmistry, a gently curved head line is associated with imagination, while a clear heart line is associated with emotional openness. Treat these ideas as prompts to explore your own experience.',
  imageQualityCheck: { clarity: 'Sample illustration', confidenceImpact: 'No photo has been analyzed.', notes: 'This is an illustrative reading, written in advance to preview the experience.' },
  aspects: [
    { aspectName: 'Personality & purpose', summary: 'Your curiosity is a strength worth making space for.', detailedInterpretation: 'Traditionally, a head line that curves toward the outer palm is interpreted as imaginative thinking. A useful question to sit with: when did you last follow an idea simply because it interested you? You may find clarity by balancing room for exploration with one small commitment.', palmEvidence: 'Example feature: a gently curved head line. This is an illustration, not an observation of your hand.' },
    { aspectName: 'Career & growth', summary: 'Make room for work that feels like your own.', detailedInterpretation: 'In palmistry traditions, an independently rising fate line can symbolize a self-directed path. Use that symbolism to reflect on which parts of your work give you energy, and which expectations you may have outgrown. One practical step is to choose a skill you want to develop this month.', palmEvidence: 'Example feature: an independently rising fate line.' },
    { aspectName: 'Love & connection', summary: 'Openness and boundaries can grow together.', detailedInterpretation: 'A clear heart line is traditionally associated with warmth and emotional expression. That does not establish anything about a person or predict a relationship. As a reflection, consider whether you are communicating your needs as generously as you listen to others.', palmEvidence: 'Example feature: a clear, softly curved heart line.' },
    { aspectName: 'Balance & wellbeing', summary: 'Give your energy a little breathing room.', detailedInterpretation: 'A broad life line is often used as a symbol of vitality in palmistry. It cannot reveal health, lifespan, or medical conditions. Let the symbolism serve as a reminder to notice what restores you: rest, movement, time outside, or a conversation with someone you trust.', palmEvidence: 'Example feature: a broad arc around the base of the thumb.' },
  ],
  lifeTimeline: [
    { ageRange: 'Reflect on the past', phaseName: 'Finding your footing', keyEventOrShift: 'What experience helped you understand your own values?', palmEvidence: 'A journaling prompt, rather than a predicted event.' },
    { ageRange: 'Consider the present', phaseName: 'Choosing with intention', keyEventOrShift: 'Where could a small, deliberate choice make your days feel more like you?', palmEvidence: 'A reflective prompt inspired by the symbolism of the fate line.' },
    { ageRange: 'Imagine what comes next', phaseName: 'Making space to grow', keyEventOrShift: 'What would you like to learn, nurture, or explore next?', palmEvidence: 'An open question, not a forecast.' },
  ],
  behavioralPatterns: [{ pattern: 'Curiosity with a thoughtful streak', evidence: 'An example interpretation inspired by a curved head line.', confidence: 0 }, { pattern: 'Warmth with a need for independence', evidence: 'An example interpretation inspired by the heart and fate lines.', confidence: 0 }],
  recommendedActions: ['Write down one thing you want more of in your week.', 'Choose a small next step toward an idea that interests you.', 'Make time for a conversation where you can be honest about what you need.'],
  overallConfidence: 0,
};
export const sampleReading: Reading = { id: 'sample', userId: 'sample', title: 'A glimpse into your reading', readingText: JSON.stringify(content), createdAt: 0, mode: 'standard', isSample: true };
