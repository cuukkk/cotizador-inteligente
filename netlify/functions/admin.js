export async function handler(event){
  const key = event.headers["x-admin-key"];
  if(key !== process.env.ADMIN_KEY) return {statusCode:401, body:"unauthorized"};
  const body = JSON.parse(event.body||"{}");
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const fetchSB = (path, opt={}) => fetch(`${SB_URL}/rest/v1/${path}`,{
    ...opt,
    headers:{
      "Content-Type":"application/json",
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`,
      ...(opt.headers||{})
    }
  });

  if(body.action==="list_leads"){
    const r = await fetchSB("leads?select=*");
    return {statusCode:200, body:JSON.stringify(await r.json())};
  }
  if(body.action==="get_lead"){
    const r = await fetchSB(`leads?id=eq.${body.id}&select=*`);
    const [lead] = await r.json();
    return {statusCode:200, body:JSON.stringify(lead||{})};
  }
  if(body.action==="update_lead"){
    await fetchSB(`leads?id=eq.${body.id}`,{
      method:"PATCH",
      body:JSON.stringify({
        insurer:body.insurer, cobertura:body.cobertura,
        monto_total:body.monto_total, meses_cobertura:body.meses_cobertura,
        status:"cotizado"
      })
    });
    return {statusCode:200, body:JSON.stringify({ok:true})};
  }
  if(body.action==="get_settings"){
    const r = await fetchSB("admin_settings?select=*");
    const [s] = await r.json();
    return {statusCode:200, body:JSON.stringify(s||{})};
  }
  if(body.action==="set_settings"){
    await fetchSB("admin_settings",{
      method:"POST",
      headers:{ "Prefer":"resolution=merge-duplicates" },
      body:JSON.stringify({id:1, email_to:body.email_to, email_from:body.email_from})
    });
    return {statusCode:200, body:JSON.stringify({ok:true})};
  }
  if(body.action==="get_catalogs"){
    const ins = await (await fetchSB("insurers?select=name&order=position.asc")).json();
    const cov = await (await fetchSB("coverages?select=name&order=position.asc")).json();
    return {statusCode:200, body:JSON.stringify({
      insurers: ins.map(i=>i.name),
      coverages: cov.map(c=>c.name)
    })};
  }
  if(body.action==="set_catalogs"){
    await fetchSB("insurers", {method:"DELETE"});
    await fetchSB("coverages", {method:"DELETE"});
    const ins = body.insurers.map((n,i)=>({name:n, position:i}));
    const cov = body.coverages.map((n,i)=>({name:n, position:i}));
    if(ins.length) await fetchSB("insurers",{method:"POST",body:JSON.stringify(ins)});
    if(cov.length) await fetchSB("coverages",{method:"POST",body:JSON.stringify(cov)});
    return {statusCode:200, body:JSON.stringify({ok:true})};
  }
  if(body.action==="metrics"){
    const r = await fetchSB("lead_events?select=event");
    const data = await r.json();
    const count = (e)=> data.filter(x=>x.event===e).length;
    return {statusCode:200, body:JSON.stringify({
      started:count("started"),
      saved:count("saved"),
      submitted:count("submitted"),
      edited:count("edited")
    })};
  }
  return {statusCode:400, body:"bad request"};
}
