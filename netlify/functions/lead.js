export async function handler(event){
  if(event.httpMethod !== "POST") return {statusCode:405, body:""};
  const data = JSON.parse(event.body || "{}");
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const res = await fetch(`${SB_URL}/rest/v1/leads`,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`,
      "Prefer":"return=representation"
    },
    body: JSON.stringify({
      nombre:data.nombre, edad:data.edad, cp:data.cp,
      telefono:data.telefono, email:data.email,
      year:data.year, make:data.make, model:data.model, version:data.version,
      broker:data.broker, broker_id:data.broker_id,
      niv:data.niv, card_url:data.card_url, niv_url:data.niv_url,
      status:"pendiente"
    })
  });
  if(!res.ok) return {statusCode:500, body:"Error insert"};
  const [lead] = await res.json();

  await fetch(`${SB_URL}/rest/v1/lead_events`,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`
    },
    body: JSON.stringify({lead_id:lead.id, event:"submitted"})
  });

  return {statusCode:200, body:JSON.stringify({ok:true, id:lead.id})};
}
