#!/usr/bin/env python3
"""Estrae la mappa di Aurora Casa Viva dalle plance di Home Assistant e la prepara per Aurora Casa 3D.

Non serve per usare la scheda: con  casa_viva: auto  la scheda trova la mappa da sola.
Serve se vuoi la configurazione "congelata" in un file (da incollare nella scheda, da tenere in un
backup, da modificare a mano) oppure per vedere quali schede Casa Viva ci sono nelle tue plance.

Uso (nel terminale di Home Assistant, via SSH, o su una copia della cartella di configurazione):
    python3 estrai-casa-viva.py                       # cerca in /config
    python3 estrai-casa-viva.py /percorso/config      # un'altra cartella di configurazione
    python3 estrai-casa-viva.py --elenco              # solo l'elenco delle schede trovate
    python3 estrai-casa-viva.py --scheda 2 -o casa.yaml
    python3 estrai-casa-viva.py --solo-mappa          # senza la riga type, per incollarla in rooms

Legge .storage/lovelace e .storage/lovelace.* (plance create dall'interfaccia) e, se c'è PyYAML,
anche i file YAML delle plance indicati in configuration.yaml. Non scrive niente in Home Assistant.
Solo libreria standard di Python (PyYAML è facoltativo).
"""
import argparse
import glob
import json
import os
import sys

CV = "custom:aurora-casa-viva"
NUOVO = "custom:aurora-casa-3d"


def trova(nodo, uscita, ctx):
    """Cerca ricorsivamente le schede Aurora Casa Viva (anche dentro stack, sezioni, condizioni)."""
    if isinstance(nodo, list):
        for x in nodo:
            trova(x, uscita, ctx)
    elif isinstance(nodo, dict):
        if nodo.get("type") == CV and isinstance(nodo.get("rooms"), dict):
            uscita.append({"config": nodo, **ctx})
            return
        for v in nodo.values():
            if isinstance(v, (list, dict)):
                trova(v, uscita, ctx)


def da_config(cfg, sorgente, uscita):
    for i, vista in enumerate((cfg or {}).get("views") or []):
        trova(vista, uscita, {"sorgente": sorgente, "vista": vista.get("title") or vista.get("path") or str(i)})


def leggi_storage(cartella):
    uscita = []
    for f in sorted(glob.glob(os.path.join(cartella, ".storage", "lovelace*"))):
        base = os.path.basename(f)
        if base.startswith("lovelace_resources") or base.startswith("lovelace_dashboards"):
            continue
        try:
            with open(f, encoding="utf-8") as fh:
                dati = json.load(fh)
        except (OSError, ValueError):
            continue
        cfg = (dati.get("data") or {}).get("config")
        if cfg:
            da_config(cfg, base, uscita)
    return uscita


def leggi_yaml(cartella):
    uscita = []
    try:
        import yaml  # noqa: PLC0415
    except ImportError:
        return uscita

    class Loader(yaml.SafeLoader):
        pass

    # !include, !secret e simili: qui non servono, si lasciano come testo
    Loader.add_multi_constructor("!", lambda loader, suffix, node: None)
    for f in sorted(glob.glob(os.path.join(cartella, "**", "*.yaml"), recursive=True)):
        if "/.storage/" in f or "/custom_components/" in f or "/www/" in f or "/deps/" in f:
            continue
        try:
            with open(f, encoding="utf-8") as fh:
                testo = fh.read()
            if CV not in testo:
                continue
            cfg = yaml.load(testo, Loader=Loader)  # noqa: S506 (SafeLoader)
        except (OSError, yaml.YAMLError):
            continue
        if isinstance(cfg, dict) and cfg.get("views"):
            da_config(cfg, os.path.relpath(f, cartella), uscita)
    return uscita


def scrivi(obj):
    """YAML se c'è PyYAML, altrimenti JSON (che per Home Assistant è YAML valido)."""
    try:
        import yaml  # noqa: PLC0415
        return yaml.safe_dump(obj, allow_unicode=True, sort_keys=False, default_flow_style=None, width=140)
    except ImportError:
        return json.dumps(obj, ensure_ascii=False, indent=2) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cartella", nargs="?", default="/config", help="cartella di configurazione di Home Assistant (predefinita /config)")
    ap.add_argument("--elenco", action="store_true", help="mostra solo le schede trovate")
    ap.add_argument("--scheda", type=int, default=1, help="quale scheda estrarre, dal numero dell'elenco (predefinita 1)")
    ap.add_argument("--solo-mappa", action="store_true", help="scrive solo il contenuto, senza type e senza il commento iniziale")
    ap.add_argument("-o", "--out", help="scrive in un file invece che a schermo")
    a = ap.parse_args()

    trovate = leggi_storage(a.cartella) + leggi_yaml(a.cartella)
    if not trovate:
        print(f"Nessuna scheda Aurora Casa Viva trovata in {a.cartella}.\n"
              "Controlla il percorso della cartella di configurazione (in Home Assistant OS è /config)\n"
              "e che la scheda sia salvata in una plancia. Se non puoi leggere la cartella, usa la scheda\n"
              "con  casa_viva: auto  e lascia fare a lei.", file=sys.stderr)
        return 1

    print(f"Trovate {len(trovate)} schede Aurora Casa Viva:", file=sys.stderr)
    for i, t in enumerate(trovate, 1):
        c = t["config"]
        print(f"  {i}. {t['sorgente']} · vista «{t['vista']}» · {len(c['rooms'])} stanze, "
              f"{len(c.get('openings') or [])} finestre, {len(c.get('devices') or [])} apparecchi", file=sys.stderr)
    if a.elenco:
        return 0
    if not 1 <= a.scheda <= len(trovate):
        print(f"--scheda va da 1 a {len(trovate)}.", file=sys.stderr)
        return 2

    scelta = trovate[a.scheda - 1]
    cfg = json.loads(json.dumps(scelta["config"]))  # copia
    cfg.pop("type", None)
    if a.solo_mappa:
        testo = scrivi(cfg)
    else:
        testo = (f"# Aurora Casa 3D, dalla mappa Casa Viva «{scelta['vista']}» ({scelta['sorgente']})\n"
                 "# Incollala in una scheda Manuale. In alternativa basta  casa_viva: auto  e non serve questo file.\n"
                 + scrivi({"type": NUOVO, **cfg}))
    if a.out:
        with open(a.out, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(testo)
        print(f"Scritto {a.out}", file=sys.stderr)
    else:
        sys.stdout.write(testo)
    return 0


if __name__ == "__main__":
    sys.exit(main())
