#!/usr/bin/env python3
"""Tool calling real: ciclo completo de 2 turnos. El modelo pide la herramienta, le devolvemos
el resultado, y tiene que USARLO (no inventar el dato). Se mide: emite tool_call, argumentos
correctos, y respuesta final basada en el resultado real.
Claves via `az`, nunca impresas.
"""
import json, subprocess, time, urllib.request, urllib.error

MODELOS = {
    'nano':  ('tomaspieruz-suuth-resource', 'rg-tomaspieruz-0687', 'gpt-5.4-nano'),
    'astra': ('tomaspieruz-8921-resource',  'rg-tomaspieruz-0687', 'gpt-6-astra'),
    'grok':  ('tomaspieruz-8921-resource',  'rg-tomaspieruz-0687', 'grok-4.6'),
    'g41mini':('nodeflow',                  'nodeflow',            'gpt-4.1-mini'),
}

TOOLS = [
  {"type":"function","function":{"name":"leer_archivo",
   "description":"Devuelve el contenido de un archivo del repo.",
   "parameters":{"type":"object","properties":{"ruta":{"type":"string","description":"ruta relativa al repo"}},"required":["ruta"]}}},
  {"type":"function","function":{"name":"correr_comando",
   "description":"Ejecuta un comando de shell y devuelve su salida.",
   "parameters":{"type":"object","properties":{"cmd":{"type":"string"}},"required":["cmd"]}}},
]

# El dato real existe solo en el RESULTADO de la herramienta: si el modelo responde sin usarla, inventa.
PREGUNTA = ("Necesito saber cuantos defectos sembrados tiene el verificador de la prueba 5.b. "
            "Usa la herramienta leer_archivo sobre 'docs/research/prueba-5b/verificador.json' y decime el numero exacto.")
RESULTADO_TOOL = json.dumps({"contenido": '{"defectos_sembrados": [8 objetos], "total": 8}'})

def az(*a):
    return subprocess.run('az ' + ' '.join(a), capture_output=True, text=True, timeout=120, shell=True).stdout.strip()

def cred(rec, rg):
    ep = az('cognitiveservices','account','show','-n',rec,'-g',rg,'--query','properties.endpoint','-o','tsv')
    k  = az('cognitiveservices','account','keys','list','-n',rec,'-g',rg,'--query','key1','-o','tsv')
    return ep.rstrip('/'), k

def post(ep, key, dep, msgs, tools=None):
    c = {'messages': msgs, 'max_completion_tokens': 900}
    if tools: c['tools'], c['tool_choice'] = tools, 'auto'
    r = urllib.request.Request(f'{ep}/openai/deployments/{dep}/chat/completions?api-version=2024-10-21',
        data=json.dumps(c).encode(), headers={'api-key': key, 'Content-Type':'application/json'}, method='POST')
    t0 = time.time()
    try:
        with urllib.request.urlopen(r, timeout=180) as resp: d = json.loads(resp.read().decode())
        return time.time()-t0, d, None
    except urllib.error.HTTPError as e:
        return time.time()-t0, None, f'HTTP {e.code}: {e.read().decode()[:100]}'
    except Exception as e:
        return time.time()-t0, None, f'{type(e).__name__}: {str(e)[:80]}'

print('CICLO DE HERRAMIENTAS (2 turnos: pide la tool -> recibe el resultado -> responde)')
print('=' * 92)
for n,(rec,rg,dep) in MODELOS.items():
    ep,key = cred(rec,rg)
    if not key: print(f'{n}: sin clave'); continue
    msgs = [{"role":"user","content":PREGUNTA}]
    t1,d1,e1 = post(ep,key,dep,msgs,TOOLS)
    if e1:
        print(f'\n### {n:8} TURNO 1 FALLO  {e1}'); continue
    m1 = (d1.get('choices') or [{}])[0].get('message',{})
    tcs = m1.get('tool_calls') or []
    print(f'\n### {n:8} turno 1 ({t1:.0f}s)')
    if not tcs:
        cont = (m1.get('content') or '')[:100].replace('\n',' ')
        print(f'    NO emitio tool_call. Dijo: {cont!r}')
        print(f'    -> sin llamada a herramienta no se puede medir el ciclo')
        continue
    tc = tcs[0]; fn = tc.get('function',{})
    try: args = json.loads(fn.get('arguments') or '{}')
    except Exception: args = {}
    ok_arg = 'verificador.json' in str(args.get('ruta',''))
    print(f'    tool_call -> {fn.get("name")}  args={args}')
    print(f'    argumentos correctos: {"SI" if ok_arg else "NO"}')
    # turno 2: le devolvemos el resultado y exigimos que lo USE
    msgs += [m1, {"role":"tool","tool_call_id":tc.get('id'),"content":RESULTADO_TOOL}]
    t2,d2,e2 = post(ep,key,dep,msgs)
    if e2: print(f'    turno 2 fallo: {e2}'); continue
    cont = ((d2.get('choices') or [{}])[0].get('message',{}).get('content') or '')
    usa = '8' in cont
    print(f'    turno 2 ({t2:.0f}s): uso el resultado real: {"SI" if usa else "NO"}')
    print(f'    respuesta: {cont[:150].replace(chr(10)," ")!r}')
