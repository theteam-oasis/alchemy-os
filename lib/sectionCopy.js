// Shared section titles + subtitles used by BOTH the team workspace and the
// client portal. Editing any of these strings updates both views in lockstep.
//
// If team and client copy ever needs to diverge, split it here (e.g.
// `creatives.team` vs `creatives.client`) - but the goal is to keep them in sync.

export const SECTION_COPY = {
  analytics: {
    title: "Analytics",
    subtitle: "Live performance data, KPIs and Oracle AI insights.",
  },
  creatives: {
    title: "Creatives",
    /**
     * Builds the Creatives subtitle with live feedback counts.
     * @param {{approved:number, revision:number, rejected:number}} feedback
     */
    subtitle: ({ approved = 0, revision = 0, rejected = 0 } = {}) =>
      `Review and approve assets. ${approved} approved · ${revision} revisions · ${rejected} rejected.`,
  },
  brand: {
    title: "Brand Guidelines",
    /**
     * @param {string} clientName
     */
    subtitle: (clientName) =>
      `The foundation for every creative we build for ${clientName}.`,
  },
};
