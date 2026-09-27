#!/usr/bin/env python3
"""Prueba 5.b: lectura de contratos con defectos sembrados.

Un solo prompt, identico para todos los modelos. El emparejamiento contra el ground truth es
mecanico (keywords), asi que ningun juicio del orquestador entra en el conteo.
Las claves se leen con `az` y no se imprimen.
"""
import json, re, subprocess, time, urllib.request, urllib.error, pathlib

REPO = pathlib.Path(r'C:/Users/tomas/Desktop/Nodeflow BOB/nodeflow-ibm-bob')
CONTRATO = (REPO / 'docs/research/prueba-5b/PEDIDO-11-PRUEBA-voz-cola-de-espera.md').read_text(encoding='utf-8')
GT = json.loads((REPO / 'docs/research/prueba-5b/verificador.json').read_text(encoding='utf-8'))

MODELOS = {
    'astra':    ('tomaspieruz-8921-resource',  'rg-tomaspieruz-0687', 'gpt-6-astra'),
    'nano':     ('tomaspieruz-suuth-resource', 'rg-tomaspieruz-0687', 'gpt-5.4-nano'),
    'gpt5':     ('tomaspieruz-suuth-resource', 'rg-tomaspieruz-0687', 'gpt-5'),
    'mini':     ('tomaspieruz-8921-resource',  'rg-tomaspieruz-0687', 'gpt-5-mini'),
    'grok':     ('tomaspieruz-8921-resource',  'rg-tomaspieruz-0687', 'grok-4.6'),
    'deepseek': ('tomaspieruz-8921-resource',  'rg-tomaspieruz-0687', 'DeepSeek-V4-Flash'),
    'g41mini':  ('nodeflow',                   'nodeflow',            'gpt-4.1-mini'),
}

PROMPT = """Sos el orquestador de un equipo de agentes. Te paso un contrato de trabajo (PEDIDO) tal como se despacharia a un ejecutor.
Tu tarea: detectar los problemas del contrato ANTES de despacharlo.

Devolve SOLO un JSON valido, sin texto alrededor, con esta forma exacta:
{"apto": true, "defectos": [{"tipo": "contradiccion|decision_ausente|solapamiento|dependencia_no_declarada|referencia_inventada|caso_faltante|otro", "cita": "texto exacto del contrato", "porque": "que problema causa", "severidad": "alta|media|baja"}], "decisiones_faltantes": ["..."]}

Reglas:
- "cita" tiene que ser texto que exista textualmente en el contrato. No inventes citas ni archivos.
- Si el contrato esta bien, devolve {"apto": true, "defectos": [], "decisiones_faltantes": []}
- No agregues explicaciones fuera del JSON.

CONTRATO:
""" + CONTRATO

def az(*args):
    cmd = 'az ' + ' '.join(f'"{a}"' if ' ' in a else a for a in args)
    return subprocess.run(cmd, capture_output=True, text=True, timeout=120, shell=True).stdout.strip()

def credenciales(rec, rg):
    ep = az('cognitiveservices','account','show','-n',rec,'-g',rg,'--query','properties.endpoint','-o','tsv')
    key = az('cognitiveservices','account','keys','list','-n',rec,'-g',rg,'--query','key1','-o','tsv')
    return ep.rstrip('/'), key

def llamar(ep, key, dep):
    cuerpo = {'messages': [{'role':'user','content':PROMPT}], 'max_completion_tokens': 2200}
    req = urllib.request.Request(f'{ep}/openai/deployments/{dep}/chat/completions?api-version=2024-10-21',
        data=json.dumps(cuerpo).encode(),
        headers={'api-key': key, 'Content-Type':'application/json'}, method='POST')
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            d = json.loads(r.read().decode())
        return time.time()-t0, ((d.get('choices') or [{}])[0].get('message',{}).get('content') or ''), None
    except urllib.error.HTTPError as e:
        return time.time()-t0, '', f'HTTP {e.code}: {e.read().decode()[:110]}'
    except Exception as e:
        return time.time()-t0, '', f'{type(e).__name__}: {str(e)[:90]}'

def extraer_json(txt):
    """Devuelve (objeto, cumple_esquema). Tolera vallas de codigo: eso NO es fallar el esquema."""
    limpio = re.sub(r'^```(?:json)?|```$', '', txt.strip(), flags=re.M).strip()
    m = re.search(r'\{.*\}', limpio, re.S)
    if not m: return None, False
    try:
        o = json.loads(m.group(0))
    except Exception:
        return None, False
    ok = isinstance(o, dict) and 'defectos' in o and isinstance(o['defectos'], list)
    if ok:
        # el esquema pide que cada defecto traiga las 4 claves
        ok = all(isinstance(x, dict) and {'tipo','cita','porque','severidad'} <= set(x) for x in o['defectos'])
        ok = ok and 'apto' in o
    return o, ok

def emparejar(o, gt):
    """Mecanico: un defecto sembrado se encuentra si aparece alguna de sus keywords en lo reportado."""
    encontrados, sobrantes = set(), []
    texto_defectos = []
    for d in o.get('defectos', []):
        texto_defectos.append(' | '.join(str(d.get(k,'')) for k in ('tipo','cita','porque')).lower())
    for dd in gt['defectos_sembrados']:
        hit = False
        for i, t in enumerate(texto_defectos):
            if hit: break
            for grupo in dd['keywords']:
                if all(k.lower() in t for k in grupo if k):      # un grupo = todas sus palabras
                    hit = True; break
        if hit: encontrados.add(dd['id'])
    # sobrantes: defectos reportados que no tocaron ninguna keyword de ningun sembrado
    todas = [k.lower() for dd in gt['defectos_sembrados'] for g in dd['keywords'] for k in g if k]
    for t in texto_defectos:
        if not any(k in t for k in todas): sobrantes.append(t[:70])
    return encontrados, sobrantes

RES = {}
print('=' * 96)
print('PRUEBA 5.b - lectura de contratos con defectos sembrados (8 sembrados)')
print('=' * 96)
for nombre, (rec, rg, dep) in MODELOS.items():
    try:
        ep, key = credenciales(rec, rg)
    except Exception as e:
        print(f'{nombre}: credenciales -> {e}'); continue
    if not key:
        print(f'{nombre}: sin clave'); continue
    t, txt, err = llamar(ep, key, dep)
    if err:
        print(f'\n### {nombre:9} FALLO  ({t:.0f}s)  {err}')
        RES[nombre] = {'error': err, 'seg': t}
        continue
    o, ok = extraer_json(txt)
    if o is None:
        print(f'\n### {nombre:9} no devolvio JSON  ({t:.0f}s)  primeras 120: {txt[:120]!r}')
        RES[nombre] = {'json': False, 'seg': t, 'raw': txt[:400]}
        continue
    enc, sobr = emparejar(o, GT)
    RES[nombre] = {'json': True, 'esquema': ok, 'seg': t, 'encontrados': sorted(enc),
                   'n_defectos': len(o.get('defectos', [])), 'apto': o.get('apto'),
                   'sobrantes': sobr, 'defectos': o.get('defectos', [])[:10], 'raw': txt}
    print(f"\n### {nombre:9} {t:5.0f}s  recall {len(enc)}/8  reportados {len(o.get('defectos',[]))}  esquema {'OK' if ok else 'NO'}  apto={o.get('apto')}")
    print(f"    encontro: {', '.join(sorted(enc)) or 'ninguno'}")
    print(f"    le falto: {', '.join(sorted(set(d['id'] for d in GT['defectos_sembrados']) - enc)) or '-'}")
    if sobr: print(f"    sobrantes (posibles falsos positivos): {len(sobr)}")

(REPO / 'docs/research/prueba-5b/resultados.json').write_text(json.dumps(RES, ensure_ascii=False, indent=2), encoding='utf-8')
print('\n' + '=' * 96)
print('Resultados crudos en docs/research/prueba-5b/resultados.json')
