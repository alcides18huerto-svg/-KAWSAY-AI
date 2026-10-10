const API = (import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1").replace(/\/+$/, "");

export async function request<T = unknown>(path:string, options:RequestInit = {}):Promise<T> {
  const token = localStorage.getItem("token");
  const headers = new Headers(options.headers);
  if(options.body && !headers.has("Content-Type")) headers.set("Content-Type","application/json");
  if(token) headers.set("Authorization",`Bearer ${token}`);

  const response = await fetch(`${API}${path}`,{...options,headers});
  const body = await response.json().catch(()=>null);
  if(!response.ok) {
    const detail = body?.detail;
    const message = typeof detail==="string" ? detail : Array.isArray(detail)
      ? detail.map((item:{msg?:string})=>item.msg).filter(Boolean).join(", ")
      : body?.message;
    if(response.status===401) localStorage.removeItem("token");
    throw new Error(message || `Error HTTP ${response.status}`);
  }
  return body as T;
}
