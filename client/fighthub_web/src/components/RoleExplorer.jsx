"use client";

import { useState } from "react";
import { earlyAccessEmail } from "./Brand";

const roles = [
  {
    name: "Fighters",
    title: "Put your record to work.",
    summary: "Give scouts the details they need and apply to open fight slots from your phone.",
    features: [
      ["Build a fighter profile", "Add your gym, weight class, fight style, and win–loss–draw record."],
      ["Share fight clips", "Give scouts footage alongside your profile and record."],
      ["Apply to openings", "Review the slot details, apply, and track the status of your application."],
    ],
    example: { type: "Fight opportunity", title: "Amateur MMA", specs: "Welterweight · Kamloops, BC", rows: [["Weight limit", "170 lb"], ["Applications", "Open"], ["Application status", "Submitted"]] },
  },
  {
    name: "Scouts",
    title: "Find fighters for your card.",
    summary: "Search by what matters for the matchup, follow up directly, and manage applicants in one place.",
    features: [
      ["Search the fighter directory", "Filter by weight class, fight style, region, and minimum wins."],
      ["Save prospects and reach out", "Add fighters to your watchlist and message them in the app."],
      ["Publish and fill openings", "Post fight slots and review, shortlist, or book applicants."],
    ],
    example: { type: "Scout workspace", title: "Published fight slot", specs: "Amateur MMA · Welterweight", rows: [["Application status", "Shortlisted"], ["Coach endorsement", "Attached"], ["Next step", "Review for booking"]] },
  },
  {
    name: "Coaches",
    title: "Back the fighters you train.",
    summary: "Manage your gym roster and support fighters as they pursue opportunities.",
    features: [
      ["Manage your roster", "Review gym membership requests and see the fighters on your roster."],
      ["Endorse applications", "Add your recommendation to an eligible fighter’s application."],
      ["Submit a fighter", "Choose an open slot and submit an eligible fighter with an optional note."],
    ],
    example: { type: "Coach workspace", title: "Fighter submission", specs: "Amateur MMA · Welterweight", rows: [["Roster eligibility", "Gym member"], ["Endorsement", "Added"], ["Application status", "Submitted"]] },
  },
];

export default function RoleExplorer() {
  const [selected, setSelected] = useState(0);
  const { name, title, summary, features, example } = roles[selected];

  return (
    <div className="role-explorer">
      <div className="role-selector" role="group" aria-label="Choose a Kavyx role">
        {roles.map((role, index) => (
          <button key={role.name} type="button" aria-pressed={selected === index} aria-controls="role-details" onClick={() => setSelected(index)}>
            {role.name}
          </button>
        ))}
      </div>
      <div className="role-panel" id="role-details">
        <div className="role-copy">
          <h3>{title}</h3>
          <p className="role-summary">{summary}</p>
          <ul className="role-features">
            {features.map(([feature, detail]) => (
              <li key={feature}><strong>{feature}</strong><span>{detail}</span></li>
            ))}
          </ul>
          <a className="inline-link" href={earlyAccessEmail(name)}>Ask about access for {name.toLowerCase()} <span aria-hidden="true">→</span></a>
        </div>
        <div className="product-example">
          <div className="example-top"><span>{example.type}</span><span>Illustrative example</span></div>
          <h4>{example.title}</h4>
          <p>{example.specs}</p>
          <dl>{example.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </div>
      </div>
      <span className="sr-only" role="status">Showing {name.toLowerCase()} workflow</span>
    </div>
  );
}
