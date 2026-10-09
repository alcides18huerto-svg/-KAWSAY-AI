import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
import psycopg

combos = [
    ("postgres", "1234", "KAUSAIA"),
    ("postgres", "1234", "kawsay"),
    ("postgres", "1234", "postgres"),
    ("postgres", "1234", None),
    ("kawsay", "1234", "KAUSAIA"),
    ("KAUSAIA", "1234", "KAUSAIA"),
]
for u, p, d in combos:
    try:
        c = psycopg.connect(host="localhost", port=5432, user=u, password=p,
                            dbname=d or "postgres", connect_timeout=4)
        print("OK -> user=%s pass=%s db=%s" % (u, p, d))
        with c.cursor() as cur:
            cur.execute("SELECT datname FROM pg_database ORDER BY datname")
            print("   bases:", [r[0] for r in cur.fetchall()])
        c.close()
    except Exception as e:
        print("fail user=%s pass=%s db=%s :: %s" % (u, p, d, str(e)[-90:].replace("\n", " ")))
