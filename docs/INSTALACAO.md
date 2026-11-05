# Instalação — tudo pelo browser, sem custos

Vai precisar de cerca de **30 minutos de cliques** e de mais **15 minutos de espera** enquanto o servidor se instala sozinho.
Não é preciso abrir terminais nem escrever comandos.

No fim terá a app em `https://<nome>.duckdns.org`, num servidor gratuito da Oracle Cloud na Europa.

| Passo | Onde | Tempo |
|---|---|---|
| 0. Email da associação (recomendado) | gmail.com | 5 min |
| 1. Endereço gratuito | duckdns.org | 3 min |
| 2. Conta na Oracle Cloud | oracle.com | 10 min |
| 3. Criar o servidor (com instalação automática) | Oracle Cloud | 10 min |
| 4. Abrir as portas da web | Oracle Cloud | 3 min |
| 5. Esperar e entrar na app | o seu browser | 15 min |

---

## 0. Email da associação (recomendado)

Crie um Gmail só para a associação, ex.: `ap.serpente@gmail.com`, e use-o nas contas seguintes.
Assim, quando a direção mudar, basta passar a palavra-passe deste email — tudo fica da associação e não de um pai.

## 1. Endereço gratuito (DuckDNS)

1. Abra <https://www.duckdns.org> e entre com **Google** (a conta da associação).
2. Em **sub domain** escreva o nome, ex.: `ap-serpente`, e clique **add domain**.
   O endereço fica `ap-serpente.duckdns.org`.
3. No topo da página aparece **token** (uma sequência como `a1b2c3d4-...`). **Copie-o** — vai precisar dele no passo 3.

> Não precisa de preencher o IP: o servidor faz isso sozinho.

## 2. Conta na Oracle Cloud

1. Abra <https://www.oracle.com/cloud/free/> → **Start for free**.
2. Preencha com o email da associação.
3. **Home Region:** escolha **Spain Central (Madrid)** ou **Germany Central (Frankfurt)**.
   Não pode ser mudada depois; dados na União Europeia é o mais adequado para o RGPD.
4. É pedido um cartão **apenas para verificar a identidade**. O plano *Always Free* não cobra nada.
   Não faça "Upgrade to Pay As You Go".
5. Aguarde o email de confirmação de que a conta está pronta (pode demorar alguns minutos).

## 3. Criar o servidor (a instalação é automática)

### 3a. Preparar o texto da instalação

Abra o ficheiro [`scripts/oracle-cloud-init.sh`](../scripts/oracle-cloud-init.sh) no GitHub, clique no botão
**Copy raw file** (ícone de copiar) e cole-o num bloco de notas. Altere **só** as linhas do topo:

```bash
DOMINIO="ap-serpente.duckdns.org"         # o endereço do passo 1
DUCKDNS_TOKEN="a1b2c3d4-...."             # o token do passo 1

ADMIN_NOME="Marco Mesquita"               # o seu nome
ADMIN_EMAIL="o.seu.email@gmail.com"       # o email com que vai entrar na app
ADMIN_PASSWORD="UmaPalavraPasseForte!"    # mínimo 10 caracteres

NOME_ASSOCIACAO="Associação de Pais EB JI da Serpente"
```

> Na palavra-passe não use os símbolos `"` `$` `` ` `` `\`. Depois de entrar, pode mudá-la em **Definições**.

### 3b. Criar a instância

1. Na Oracle Cloud, menu ☰ → **Compute** → **Instances** → **Create instance**.
2. **Name:** `associacao-pais`.
3. **Image and shape** → **Edit**:
   - **Change image** → **Ubuntu** → *Canonical Ubuntu 24.04* → **Select image**.
   - **Change shape** → **Ampere** → `VM.Standard.A1.Flex` com **1 OCPU** e **6 GB** de memória → **Select shape**.
     Tem a etiqueta *Always Free-eligible*.
     Se aparecer *"Out of capacity"*, escolha **Specialty and previous generation** → `VM.Standard.E2.1.Micro` (também grátis).
4. **Networking:** deixe as opções por omissão (cria uma rede nova) e confirme que
   **Automatically assign public IPv4 address** está ligado.
5. **Add SSH keys:** escolha **Generate a key pair for me** e clique **Save private key**.
   Guarde esse ficheiro no Google Drive da associação — só será preciso em caso de avaria.
6. Clique **Show advanced options** (ou **Advanced options**) → separador **Management** →
   **Initialization script** → **Paste cloud-init script** → cole **todo** o texto preparado em 3a.
7. Clique **Create**. Na página da instância, anote o **Public IP address** (útil para confirmar no passo 5).

## 4. Abrir as portas da web

1. Na página da instância, na secção **Primary VNIC**, clique no nome da **Subnet**.
2. Separador **Security** (ou **Security Lists**) → clique em **Default Security List for ...**.
3. Separador **Security rules** → **Add Ingress Rules** e preencha:
   - **Source CIDR:** `0.0.0.0/0`
   - **IP Protocol:** TCP
   - **Destination Port Range:** `80,443`
4. **Add Ingress Rules**.

## 5. Esperar e entrar

1. Espere **10 a 15 minutos**: o servidor está a instalar tudo (app, base de dados, segurança, cópias de segurança diárias).
2. Abra `https://ap-serpente.duckdns.org` (o seu endereço).
   No primeiro acesso pode demorar uns segundos a mais — está a obter o certificado de segurança (o cadeado).
3. Entre com o **email e palavra-passe** que colocou em 3a.
4. Em **Definições**:
   - confirme o **valor da quota** e indique o **saldo inicial** (dinheiro em caixa + banco hoje);
   - em **Membros da direção**, crie as contas do(a) tesoureiro(a) e restantes membros;
   - mude a sua palavra-passe (a que escreveu no script ficou guardada nas definições da instância da Oracle).
5. No telemóvel: abra o endereço → menu do browser → **Adicionar ao ecrã principal**.

✅ Pronto. A app faz uma cópia de segurança todos os dias às 03:30.

---

## Se a app não abrir ao fim de 20 minutos

| Verificar | Onde |
|---|---|
| O DuckDNS mostra o mesmo IP que a instância (passo 3b, ponto 7) | duckdns.org → coluna *current ip* |
| A regra das portas 80 e 443 existe | passo 4 |
| A instância está *Running* | Oracle → Compute → Instances |

Se tudo estiver certo, abra a **Cloud Shell** da Oracle (ícone `>_` no topo da consola, funciona no browser):
carregue a chave privada guardada no passo 3b (menu ⚙ da Cloud Shell → **Upload**) e escreva:

```bash
chmod 600 ssh-key-*.key
ssh -i ssh-key-*.key ubuntu@IP_DA_INSTANCIA "sudo tail -n 40 /var/log/associacao-instalacao.log"
```

A mensagem final deve ser **"Instalação concluída"**. Se houver um erro, copie as últimas linhas e peça ajuda.

## Painel técnico (opcional)

Em `https://<endereço>/_/` existe o painel técnico do PocketBase, com o mesmo email e palavra-passe iniciais.
Permite ver todos os dados em bruto, configurar o envio de emails (*Settings → Mail settings*) e descarregar
cópias de segurança (*Settings → Backups*). No dia a dia não é preciso.

## Manutenção (usa a Cloud Shell, como acima)

Ligar ao servidor: `ssh -i ssh-key-*.key ubuntu@IP_DA_INSTANCIA` e depois:

| Para… | Comando |
|---|---|
| Atualizar a app para a versão mais recente | `sudo bash /opt/associacao/src/scripts/atualizar.sh` |
| Atualizações de segurança (1× por mês) | `sudo apt-get update && sudo apt-get upgrade -y` |
| Ver se está a funcionar | `sudo systemctl status associacao` |
| Ver erros | `sudo journalctl -u associacao -n 100` |
| Mudar a palavra-passe do painel técnico | `sudo -u associacao /opt/associacao/bin/pocketbase superuser upsert EMAIL NOVA --dir=/opt/associacao/pb_data` |

### Cópias de segurança também no Google Drive (recomendado)

As cópias diárias ficam no servidor (`/opt/associacao/backups`, últimos 30 dias). Para ficarem também no Drive da associação:

```bash
sudo apt-get install -y rclone
sudo -u associacao rclone config
#  n → nome: drive → tipo: drive → Enter nos restantes
#  "Use web browser to automatically authenticate?" → n  → siga as instruções
sudo -u associacao bash /opt/associacao/src/scripts/backup.sh   # deve dizer "enviada para o Google Drive"
```

### Repor uma cópia

```bash
sudo systemctl stop associacao
mkdir /tmp/repor && tar -xzf /opt/associacao/backups/associacao_AAAA-MM-DD_HHMM.tar.gz -C /tmp/repor
sudo cp /tmp/repor/data.db /opt/associacao/pb_data/data.db
sudo rm -rf /opt/associacao/pb_data/storage && sudo cp -r /tmp/repor/storage /opt/associacao/pb_data/ 2>/dev/null || true
sudo rm -f /opt/associacao/pb_data/data.db-wal /opt/associacao/pb_data/data.db-shm
sudo chown -R associacao:associacao /opt/associacao/pb_data
sudo systemctl start associacao
```

---

## Alternativa sem Oracle: computador antigo / Raspberry Pi + Cloudflare Tunnel

Sem cartão de crédito e sem abrir portas no router. Precisa de um equipamento ligado 24h com Ubuntu, Debian ou
Raspberry Pi OS (um Raspberry Pi 3 ou superior chega) e de um domínio na Cloudflare (~10 €/ano; a Cloudflare não aceita DuckDNS).

1. No equipamento, num terminal:
   ```bash
   curl -fsSL -o instalar.sh https://raw.githubusercontent.com/fist23/Associacao-de-pais/HEAD/scripts/instalar.sh
   sudo ADMIN_NOME="O seu nome" ADMIN_EMAIL="email@exemplo.pt" ADMIN_PASSWORD="PalavraPasseForte" bash instalar.sh
   ```
2. Crie o túnel no painel da Cloudflare (Zero Trust → Networks → Tunnels), seguindo
   <https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/>,
   com o *Public hostname* a apontar para `http://localhost:8090`.
3. Continue no [passo 5](#5-esperar-e-entrar) usando o endereço do túnel.

## Notas de RGPD

- Recolha apenas os dados necessários; a app não pede datas de nascimento nem dados de saúde.
- Registe o consentimento de cada família (campo "Autorizou o tratamento dos dados pessoais"); os sócios sem consentimento aparecem com a marca **sem RGPD**.
- Dê a cada membro da direção o papel mínimo necessário e retire o acesso quando sair da direção.
- Famílias que saem da escola: marque como inativas e, passado o prazo definido pela associação (ex.: 1 ano), apague-as.
- A app não guarda fotografias nem ficheiros; guarde as faturas em papel ou na pasta da associação.
