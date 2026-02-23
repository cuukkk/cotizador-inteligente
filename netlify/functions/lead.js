export async function handler(event){
  if(event.httpMethod !== "POST") return {statusCode:405, body:""};
  const data = JSON.parse(event.body || "{}");

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 1) Guardar lead
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

  // 2) Evento funnel
  await fetch(`${SB_URL}/rest/v1/lead_events`,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`
    },
    body: JSON.stringify({lead_id:lead.id, event:"submitted"})
  });

  // 3) Leer settings de admin (email destino)
  const setRes = await fetch(`${SB_URL}/rest/v1/admin_settings?id=eq.1&select=*`,{
    headers:{
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`
    }
  });
  const [settings] = await setRes.json();

  // 4) Enviar email Mailjet
  const MJ_KEY = process.env.MJ_API_KEY;
  const MJ_SECRET = process.env.MJ_SECRET;
  if(MJ_KEY && MJ_SECRET && settings?.email_to){
    const mjRes = await fetch("https://api.mailjet.com/v3.1/send",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization": "Basic " + Buffer.from(`${MJ_KEY}:${MJ_SECRET}`).toString("base64")
      },
      body: JSON.stringify({
        Messages: [{
          From: { Email: settings.email_from || "no-reply@globalpromotores.com", Name: "Global Promotores" },
          To: [{ Email: settings.email_to }],
          Subject: "Nuevo lead de cotización",
          TextPart: `Nuevo lead:\nNombre: ${lead.nombre}\nTel: ${lead.telefono}\nEmail: ${lead.email}\nAuto: ${lead.year} ${lead.make} ${lead.model} ${lead.version}`,
          HTMLPart: `
            <h3>Nuevo lead</h3>
            <p><b>Nombre:</b> ${lead.nombre}</p>
            <p><b>Tel:</b> ${lead.telefono}</p>
            <p><b>Email:</b> ${lead.email}</p>
            <p><b>Auto:</b> ${lead.year} ${lead.make} ${lead.model} ${lead.version}</p>
            <p><b>Pago:</b> Pendiente</p>
          `
        }]
      })
    });
    if(!mjRes.ok){
      console.log("Mailjet error", await mjRes.text());
    }
  }

  return {statusCode:200, body:JSON.stringify({ok:true, id:lead.id})};
}
