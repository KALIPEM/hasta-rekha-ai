import { useId } from 'react';
export function PalmIllustration({ small = false }: { small?: boolean }) {
  const id = useId();
  return <svg className={small ? 'palm-illustration small' : 'palm-illustration'} viewBox="0 0 560 560" role="img" aria-label="Illustrated palm with heart, head, life, and fate lines">
    <defs><pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".55" fill="#b15b31" opacity=".22" /></pattern></defs>
    <g fill="none" stroke="#cbbca9" strokeWidth=".8"><circle cx="280" cy="277" r="204"/><circle cx="280" cy="277" r="229" strokeDasharray="2 7"/><circle cx="280" cy="277" r="159"/><path d="M280 26v36m0 431v35M27 277h36m430 0h36"/><path d="m102 99 19 19m318 318 19 19M99 455l21-21m316-316 22-22"/></g>
    <circle cx="280" cy="277" r="203" fill="#ead9c6" opacity=".17"/>
    <g transform="translate(7 7) rotate(-8 280 277)">
      <path d="M212 482c4-45-9-74-32-105-21-28-39-61-49-87-10-27-34-57-23-71 11-15 28-4 40 14l40 59-12-120-8-68c-2-19 5-33 19-34 16-2 24 10 27 30l20 128-4-157c0-20 7-35 23-35s24 14 24 34l7 152 14-131c2-19 11-30 26-28 16 2 20 17 18 33l-9 139 27-101c5-18 17-27 30-22 14 5 16 20 11 35l-27 122c-4 27-6 59-10 83-5 33-19 61-39 87-18 22-21 40-19 58" fill="#dfb48f" stroke="#78462e" strokeWidth="2.2" strokeLinejoin="round"/>
      <path d="M212 482c4-45-9-74-32-105-21-28-39-61-49-87-10-27-34-57-23-71 11-15 28-4 40 14l40 59-12-120-8-68c-2-19 5-33 19-34 16-2 24 10 27 30l20 128-4-157c0-20 7-35 23-35s24 14 24 34l7 152 14-131c2-19 11-30 26-28 16 2 20 17 18 33l-9 139 27-101c5-18 17-27 30-22 14 5 16 20 11 35l-27 122c-4 27-6 59-10 83-5 33-19 61-39 87-18 22-21 40-19 58" fill={`url(#${id})`}/>
      <g fill="none" stroke="#9c603e" strokeLinecap="round" strokeWidth="1.15"><path d="m178 141 26-3m-23 51 27-4m34-77 30 1m-29 62 31 0m20-37 28 6m-34 51 29 5m24-22 24 8m-34 33 23 7M214 447q35 7 82 1m-79 8q31 6 73 3"/><path d="M183 300q40-30 89-12t64-4M189 322q47-13 108 24M183 299q43 40 48 93t26 37M267 422q17-71 9-101t15-64"/><path d="M209 268q18-12 26-8m51-6q26-5 42 3m-130 70q-5 31 14 62m81-44q10 19 6 42m-65-16 11 4m49-65-8 11m-75-82 10 6m-52 72 13-6"/></g>
      <g fill="none" stroke="#8d4128" strokeWidth="2.5" strokeLinecap="round"><path d="M183 300q40-30 89-12t64-4"/><path d="M189 322q47-13 108 24"/><path d="M183 299q43 40 48 93t26 37"/><path d="M267 422q17-71 9-101t15-64" strokeDasharray="4 4"/></g>
    </g>
    {!small && <g fontFamily="Inter, sans-serif" fontSize="10" letterSpacing="1.8" fill="#7b6b5a"><g stroke="#a89782" strokeWidth=".8" fill="none"><path d="M325 279h73l32-24h55"/><path d="M302 339h75l42 29h66"/><path d="M221 381h-53l-39 28H69"/><path d="M278 409v63l52 26h69"/></g><text x="432" y="247">HEART LINE</text><text x="420" y="361">HEAD LINE</text><text x="62" y="402">LIFE LINE</text><text x="334" y="491">FATE LINE</text><g fill="#8d4128"><circle cx="325" cy="279" r="3"/><circle cx="302" cy="339" r="3"/><circle cx="221" cy="381" r="3"/><circle cx="278" cy="409" r="3"/></g></g>}
    <g fill="#ad623f"><path d="m460 105 3 10 10 3-10 3-3 10-3-10-10-3 10-3Z"/><path d="m75 191 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z"/><circle cx="436" cy="455" r="3"/></g>
  </svg>;
}
