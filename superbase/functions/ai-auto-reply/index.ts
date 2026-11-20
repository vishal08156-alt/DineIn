import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const AI_REPLIES = [
  "Thanks for your message! The restaurant team will respond shortly. In the meantime, is there anything specific about your reservation I can help with?",
  "Hello! I'm the assistant here. Your reservation is being prepared — the restaurant will confirm your booking soon. Anything else you'd like to know?",
  "Thanks for reaching out! If your question is about timings, your food should be ready around your arrival time. The restaurant staff will reply personally soon.",
  "Hi there! I'll make sure the restaurant sees your message. If you need to change your party size or time, just let me know and I'll flag it.",
  "Got it! The kitchen is aware of your order. A team member will be with you shortly — thanks for your patience!",
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { reservation_id } = await req.json();

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('reservation_id', reservation_id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ replied: false, reason: 'no_messages' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const last = messages[0];

    // Only auto-reply when a customer sent the most recent message and the
    // owner hasn't responded yet.
    if (last.sender_type !== 'customer') {
      return new Response(JSON.stringify({ replied: false, reason: 'last_not_customer' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if an owner has *ever* replied in this conversation.
    const ownerReplied = messages.some((m: { sender_type: string }) => m.sender_type === 'owner');
    // Check if an AI message already exists as the immediate prior message.
    const priorAi = messages[1]?.sender_type === 'ai';

    // Avoid spamming AI replies — only insert one AI reply per customer turn
    // and skip if the prior message was already an AI reply.
    if (priorAi) {
      return new Response(JSON.stringify({ replied: false, reason: 'already_replied' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reply = ownerReplied
      ? AI_REPLIES[Math.floor(Math.random() * AI_REPLIES.length)]
      : `Thanks for your message! The restaurant hasn't responded yet, but I've noted your request. They'll get back to you as soon as they're available. ${AI_REPLIES[Math.floor(Math.random() * AI_REPLIES.length)]}`;

    const { error: insertError } = await supabase.from('chat_messages').insert({
      reservation_id,
      sender_type: 'ai',
      is_ai: true,
      content: reply,
    });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ replied: true, content: reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
