import { ArrowDown, ArrowRight, BookOpen, BriefcaseBusiness, Camera, Check, Compass, Flame, Heart, Leaf, ScanLine, ShieldCheck, Sparkles } from 'lucide-react';
import { PalmIllustration } from './PalmIllustration';
interface Props { onStart: (roast?: boolean) => void; onSample: () => void; onPricing: () => void }
export function LandingPage({ onStart, onSample, onPricing }: Props) {
  return <div className="landing">
    <section className="hero section-width">
      <div className="hero-copy">
        <div className="eyebrow"><span className="little-star">✧</span> ANCIENT WISDOM, A FRESH PERSPECTIVE</div>
        <h1>A little wisdom,<br/>in the <em>palm</em> of<br/>your hand.</h1>
        <p className="hero-description">Your lines tell a story. Explore yours with the wisdom of Vedic palmistry and a little help from AI.</p>
        <div className="hero-buttons"><button className="button button-brand" onClick={() => onStart()}>Discover my reading <ArrowRight size={18}/></button><button className="sample-link" onClick={onSample}><BookOpen size={17}/> View a sample</button></div>
        <div className="hero-assurances"><span><Check size={14}/> Private account library</span><span><ShieldCheck size={14}/> Your photo, your choice</span></div>
      </div>
      <div className="hero-art"><span className="art-caption top">EVERY HAND IS A DIFFERENT STORY</span><PalmIllustration/><span className="art-caption bottom">HASTA SAMUDRIKA · THE ART OF PALM READING</span><div className="art-note"><Sparkles size={16}/><span>Ancient art.<br/><strong>New possibilities.</strong></span></div></div>
    </section>
    <div className="wisdom-strip"><span>ROOTED IN VEDIC TRADITION</span><span className="strip-star">✧</span><span>MADE FOR SELF-DISCOVERY</span><span className="strip-star">✧</span><span>THOUGHTFULLY POWERED BY AI</span></div>
    <section className="explore section-width" aria-labelledby="explore-title">
      <div className="section-heading"><div><div className="eyebrow">THERE’S MORE TO YOUR STORY</div><h2 id="explore-title">What are you curious about?</h2></div><p>Start with a question.<br/>See where your lines take you.</p></div>
      <div className="curiosity-grid">
        {[
          { icon: Compass, title: 'Your inner world', description: 'Personality, strengths, and the things that make you, you.', color: 'peach' },
          { icon: BriefcaseBusiness, title: 'Your next chapter', description: 'Purpose, ambition, and new directions worth exploring.', color: 'sage' },
          { icon: Heart, title: 'Your connections', description: 'How you love, relate, and make room for others.', color: 'lavender' },
          { icon: Leaf, title: 'Your everyday balance', description: 'A fresh perspective on your rhythms and wellbeing.', color: 'sand' },
        ].map(({icon: Icon, title, description, color}) => <button className={`curiosity-card ${color}`} key={title} onClick={() => onStart()}><Icon size={25} strokeWidth={1.3}/><h3>{title}</h3><p>{description}</p><span className="card-arrow"><ArrowRight size={18}/></span></button>)}
      </div>
    </section>
    <section id="how-it-works" className="how-section section-width">
      <div className="how-intro"><div className="eyebrow">A SMALL RITUAL OF DISCOVERY</div><h2>One palm.<br/>A new perspective.</h2><p>Nothing complicated. Just you, your hand, and a moment of curiosity.</p><a className="inline-link" href="#reading-preview">Take a peek at a reading <ArrowDown size={16}/></a></div>
      <div className="steps-list">
        {[{icon: Camera, title: 'A photo is all it takes', text: 'Capture your open palm in natural light. One hand works; both add a little more context.'}, {icon: ScanLine, title: 'Make it personal', text: 'Choose a focus and tell us which hand you use most. We’ll explore the visible lines through a Vedic lens.'}, {icon: Sparkles, title: 'Meet your reading', text: 'Explore thoughtful interpretations, reflection prompts, and small actions to take into your day.'}].map(({icon: Icon, title, text}, i) => <div className="how-step" key={title}><span className="step-number">0{i+1}</span><div><h3>{title}</h3><p>{text}</p></div><Icon size={23} strokeWidth={1.3}/></div>)}
      </div>
    </section>
    <section id="reading-preview" className="preview-section section-width">
      <div className="sample-preview"><div className="preview-top"><span className="eyebrow"><Sparkles size={13}/> A SAMPLE INSIGHT</span><span className="tiny-pill">HEAD LINE</span></div><span className="quote-mark">“</span><h3>A thoughtful mind.<br/>An independent spirit.</h3><p>A gently curved head line is traditionally associated with imagination. Perhaps your next good idea needs a little space to wander.</p><span className="preview-footnote">An illustrative example · No photo analyzed</span></div>
      <div className="preview-copy"><div className="eyebrow">MORE THAN A PREDICTION</div><h2>A chance to<br/>know yourself better.</h2><p>Think of your reading as a conversation starter with yourself. Grounded in tradition, open to interpretation, and always yours to make meaning of.</p><button className="button button-outline" onClick={onSample}>Explore the sample reading <ArrowRight size={17}/></button></div>
    </section>
    <section className="roast-banner section-width"><div className="roast-symbol"><Flame size={34} strokeWidth={1.4}/></div><div><div className="eyebrow">A LITTLE COSMIC COMEDY</div><h2>Your palm has jokes, too.</h2><p>Feeling brave? Meet your Gen Z palmist: sharp jokes, blunt callouts, and no sugarcoating. All in good fun.</p></div><button className="button button-dark" onClick={() => onStart(true)}>Roast my palm <ArrowRight size={17}/></button></section>
    <section className="faq section-width"><div className="eyebrow">A FEW THINGS TO KNOW</div><h2>Curiosity, with clarity.</h2><div className="faq-grid">
      <details><summary>Is palmistry a scientific prediction?</summary><p>No. Palmistry is a cultural and spiritual tradition, not a scientifically validated way to establish personality, diagnose health, or predict events. Our readings are for entertainment and personal reflection.</p></details>
      <details><summary>What happens to my photos?</summary><p>Your photo is sent to our server and Microsoft Azure OpenAI only when you request a reading. We do not store your photo with your reading. Your reports are saved privately in your account. Provider processing is subject to its policies.</p></details>
      <details><summary>Can I try it without signing in?</summary><p>You can explore the sample anytime. Sign in to create your own readings and revisit your private library from any device.</p></details>
      <details><summary>What does a reading cost?</summary><p>The sample is always free. Choose ₹20 for one individual reading, ₹30 for one couple reading, or ₹80 for five individual credits. Checkout uses Razorpay when connected.</p><button className="inline-link" onClick={onPricing}>Explore reading options <ArrowRight size={15}/></button></details>
    </div></section>
  </div>;
}
