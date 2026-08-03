// check-achievements: Run achievement check for the calling user.
// Body: {} (uses auth.uid internally)
// Returns: array of newly unlocked achievements.
import { createClient } from 'npm:@insforge/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const userToken = authHeader ? authHeader.replace('Bearer ', '') : null;

  const client = createClient({
    baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
    accessToken: userToken ?? undefined,
  });

  const { data: userData } = await client.auth.getCurrentUser();
  if (!userData?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await client.database.rpc('check_achievements', {
    p_user_id: userData.user.id,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const unlocks = (data ?? []) as Array<{ achievement_id: string; name: string; xp_reward: number }>;

  // Award XP for any newly unlocked achievements.
  const totalBonus = unlocks.reduce((s, a) => s + (a.xp_reward ?? 0), 0);
  if (totalBonus > 0) {
    await client.database.rpc('award_xp', {
      p_user_id: userData.user.id,
      p_amount: totalBonus,
    });
  }

  return new Response(JSON.stringify({ unlocks, bonus_xp: totalBonus }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
