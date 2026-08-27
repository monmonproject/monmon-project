// services/entitlementService.js
//
// Satu-satunya sumber kebenaran untuk tier user. Dilarang mengecek tier
// dengan cara lain di controller, route, atau handler mana pun
// (lihat SPEC.md §5 no. 1-2 dan AGENTS.md §1b no. 1).
//
// `now` SELALU diterima sebagai parameter, tidak pernah dipanggil sendiri
// lewat `new Date()` di dalam file ini (AGENTS.md §1b no. 5, STYLE.md §5).

const CAPABILITIES = {
    trial: ['record.text', 'record.voice', 'record.photo', 'ai.parse', 'ai.analysis', 'dashboard.read'],
    member: ['record.text', 'record.voice', 'record.photo', 'ai.parse', 'ai.analysis', 'dashboard.read'],
    free: ['record.text'],
};

class EntitlementService {
    // user: { trialEndsAt }
    // activeSubscription: { status, expiresAt } | null
    // now: Date
    static resolve(user, activeSubscription, now) {
        if (activeSubscription && activeSubscription.status === 'active' && activeSubscription.expiresAt > now) {
            return 'member';
        }
        if (user.trialEndsAt && now < user.trialEndsAt) {
            return 'trial';
        }
        return 'free';
    }

    static can(tier, capability) {
        return CAPABILITIES[tier].includes(capability);
    }
}

module.exports = EntitlementService;