# Instalação no servidor (gratuita)

Este guia põe a app a funcionar num servidor **Oracle Cloud Always Free**, com endereço
`https://<nome>.duckdns.org`. Demora cerca de 1 hora na primeira vez.
Não é preciso saber programar — basta copiar e colar comandos.

> Sem cartão para a Oracle? Veja a [alternativa com um computador antigo](#alternativa-computador-antigo--raspberry-pi--cloudflare-tunnel).

**Recomendação:** crie primeiro um email da associação (ex.: um Gmail `ap.escola.xxx@gmail.com`)
e use-o em todas as contas (Oracle, DuckDNS, Google Drive). Assim tudo passa para a próxima direção
sem depender de um pai em particular.

---

## 1. Criar o servidor na Oracle Cloud

1. Criar conta em <https://www.oracle.com/cloud/free/>.
   - **Home region:** escolha uma região europeia (ex.: *Spain Central (Madrid)* ou *Germany Central (Frankfurt)*). Não se pode mudar depois. Dados na UE = melhor para o RGPD.
   - É pedido um cartão **apenas para verificação** — o plano *Always Free* não cobra nada. Não faça "upgrade" para *Pay As You Go* se quiser ter a certeza de que nunca paga.
2. No menu: **Compute → Instances → Create instance**.
   - **Image:** Canonical Ubuntu 24.04.
   - **Shape:** *Ampere* `VM.Standard.A1.Flex` com 1 OCPU e 6 GB de RAM (sobra). Se disser que não há capacidade, tente mais tarde ou use `VM.Standard.E2.1.Micro` (também grátis).
   - **SSH keys:** "Generate a key pair for me" → **descarregue a chave privada** e guarde-a bem (ex.: no Drive da associação).
   - Clique **Create**. Anote o **Public IP address**.
3. Abrir as portas da web: na página da instância → **Subnet** → **Security Lists** → *Default Security List* → **Add Ingress Rules**:
   - Source CIDR `0.0.0.0/0`, IP Protocol TCP, Destination Port Range `80,443`.

> A Oracle pode recuperar instâncias grátis que fiquem semanas quase sem uso de CPU. Com a direção a usar a app regularmente não deve acontecer, e as cópias de segurança no Google Drive (passo 6) protegem contra isso.

## 2. Endereço gratuito (DuckDNS)

1. Entrar em <https://www.duckdns.org> (com a conta Google da associação).
2. Criar um subdomínio, ex.: `ap-escola` → fica `ap-escola.duckdns.org`.
3. No campo *current ip*, colocar o **Public IP** do servidor e clicar **update ip**.

## 3. Instalar a app

Ligar ao servidor (no Windows use o PowerShell; no Mac/Linux o Terminal):

```bash
ssh -i caminho/para/chave-privada.key ubuntu@IP_DO_SERVIDOR
```

Já dentro do servidor:

```bash
curl -fsSL -o instalar.sh https://raw.githubusercontent.com/fist23/Associacao-de-pais/main/scripts/instalar.sh
sudo bash instalar.sh ap-escola.duckdns.org
```

> **Repositório privado?** O servidor não consegue descarregar o código sem autorização.
> Crie um *fine-grained token* só de leitura em GitHub → Settings → Developer settings, e use:
> `sudo REPO=https://<TOKEN>@github.com/fist23/Associacao-de-pais.git bash instalar.sh ap-escola.duckdns.org`
> (e descarregue o `instalar.sh` copiando o conteúdo à mão).

O script instala tudo, cria o serviço que arranca sozinho, abre a firewall e agenda as cópias de segurança diárias.

## 4. Primeiro acesso

1. Criar a conta técnica (superutilizador) — use uma palavra-passe forte e guarde-a:
   ```bash
   sudo -u associacao /opt/associacao/bin/pocketbase superuser upsert email@associacao.pt PalavraPasseForte --dir=/opt/associacao/pb_data
   ```
2. Abrir `https://ap-escola.duckdns.org/_/` (painel técnico) e entrar com essa conta.
3. Coleção **users** → **New record**: email, password, name, **papel = admin**, *verified* ligado. Este é o administrador da direção.
4. Abrir `https://ap-escola.duckdns.org` e entrar com o administrador.
5. Em **Definições**: nome da associação, valor da quota e **saldo inicial** (dinheiro em caixa + banco à data de hoje).
6. Em **Definições → Membros da direção**, criar contas para o(a) tesoureiro(a) e restantes membros.
7. No telemóvel: abrir o endereço → menu do browser → **Adicionar ao ecrã principal**.

## 5. Configurar o email (opcional)

Sem email, as palavras-passe esquecidas são redefinidas pelo administrador em *Definições*. Funciona bem.
Se quiser, no painel técnico (`/_/` → Settings → Mail settings) pode usar o SMTP gratuito do Gmail da associação
(com uma *palavra-passe de app* do Google).

## 6. Cópias de segurança

Todos os dias às 03:30 é criada uma cópia em `/opt/associacao/backups/` (últimos 30 dias).
**Recomendado:** enviar também para o Google Drive da associação, para não perder nada se o servidor desaparecer:

```bash
sudo apt-get install -y rclone
sudo -u associacao rclone config
#  n (novo) → nome: drive → tipo: drive → (Enter nos restantes)
#  "Use web browser to automatically authenticate?" → n
#  siga as instruções (abre um link no seu computador e cola o código)
```

Testar: `sudo -u associacao bash /opt/associacao/src/scripts/backup.sh` — deve aparecer "enviada para o Google Drive".

### Repor uma cópia

```bash
sudo systemctl stop associacao
cd /tmp && mkdir repor && tar -xzf /opt/associacao/backups/associacao_AAAA-MM-DD_HHMM.tar.gz -C repor
sudo cp repor/data.db /opt/associacao/pb_data/data.db
sudo rm -rf /opt/associacao/pb_data/storage && sudo cp -r repor/storage /opt/associacao/pb_data/ 2>/dev/null || true
sudo rm -f /opt/associacao/pb_data/data.db-wal /opt/associacao/pb_data/data.db-shm
sudo chown -R associacao:associacao /opt/associacao/pb_data
sudo systemctl start associacao
```

## 7. Atualizar a app

Quando houver uma versão nova no GitHub:

```bash
sudo bash /opt/associacao/src/scripts/atualizar.sh
```

(faz uma cópia de segurança antes, compila e reinicia). Atualizações de segurança do Ubuntu:
`sudo apt-get update && sudo apt-get upgrade -y` uma vez por mês.

## Comandos úteis

| Para… | Comando |
|---|---|
| Ver se está a funcionar | `sudo systemctl status associacao` |
| Ver erros | `sudo journalctl -u associacao -n 100` |
| Reiniciar | `sudo systemctl restart associacao` |
| Redefinir a palavra-passe técnica | `sudo -u associacao /opt/associacao/bin/pocketbase superuser upsert EMAIL NOVA --dir=/opt/associacao/pb_data` |

---

## Alternativa: computador antigo / Raspberry Pi + Cloudflare Tunnel

Sem cartão de crédito e sem abrir portas no router. Precisa de um equipamento ligado 24h com Ubuntu/Debian/Raspberry Pi OS
(um Raspberry Pi 3 ou superior chega) e de um domínio gerido pela Cloudflare
(a Cloudflare não aceita subdomínios DuckDNS; um domínio `.pt`/`.com` custa ~10 €/ano — ou use o endereço
temporário `trycloudflare.com` apenas para testes).

1. Instalar a app sem domínio (fica só acessível localmente na porta 8090):
   ```bash
   sudo bash instalar.sh
   ```
2. Instalar o `cloudflared` e criar o túnel seguindo
   <https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/>,
   apontando o *Public hostname* para `http://localhost:8090`.
3. Continuar no [passo 4](#4-primeiro-acesso) usando o endereço do túnel.

## Notas de RGPD

- Recolha apenas os dados necessários; a app não pede datas de nascimento nem dados de saúde.
- Registe o consentimento de cada família (campo "Autorizou o tratamento dos dados pessoais"); os sócios sem consentimento aparecem com a etiqueta **RGPD**.
- Dê a cada membro da direção o papel mínimo necessário e retire o acesso quando sair da direção.
- Famílias que saem da escola: marque como inativas e, passado o prazo definido pela associação (ex.: 1 ano após o fim das quotas), apague-as.
- Os comprovativos (faturas) ficam guardados no servidor; não carregue documentos com dados de saúde ou outros dados sensíveis.
