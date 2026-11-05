# Instalação na PocketBase Cloud — gratuita, tudo pelo browser

Cerca de **20 minutos**, sem terminal e sem servidor para gerir.
No fim, a app fica num endereço do tipo `https://cpwz2m8z4mvbo2c.pwz5.pocketbasecloud.com` (aleatório no plano gratuito;
endereço personalizado só nos planos pagos). Guarde-o nos favoritos e no ecrã principal do telemóvel.

**O que precisa:**
- **Ficheiro da app:** `app-associacao.zip`. Descarregue-o em
  [Releases → Versão mais recente da app](https://github.com/fist23/Associacao-de-pais/releases/tag/app-mais-recente)
  (é gerado automaticamente sempre que a app é atualizada).
- **Email da associação:** de preferência um Gmail, ex.: `ap.serpente@gmail.com`, para a conta pertencer à associação e não a um pai.

---

## 1. Criar a conta e a instância

1. Abra <https://pocketbasecloud.com> e crie conta com o email da associação.
2. Crie uma **instância PocketBase** (plano **Free**):
   - **Nome:** ex.: `ap-serpente` (é só um nome interno).
   - **Email e palavra-passe de administrador:** é a conta técnica do painel `/_/`. Use o email da associação
     e uma palavra-passe forte, e guarde-a bem.
3. Espere até a instância aparecer como **Running**. Na secção **Admin Access** está o **Admin URL**,
   ex.: `https://cpwz2m8z4mvbo2c.pwz5.pocketbasecloud.com/_/`. **O endereço da app é este mesmo, sem o `/_/` no fim.**
4. O aviso "No environment variables" pode ser ignorado: a app não precisa de variáveis.

## 2. Carregar a app

1. Na página da instância, clique na **seta ⌄ ao lado de Deploy** e escolha a opção de carregar ficheiros.
2. Escolha ou arraste o ficheiro **`app-associacao.zip`** (sem o descompactar).
3. Aguarde a mensagem de sucesso. A instância reinicia e cria sozinha as tabelas (sócios, eventos, tesouraria…).

## 3. Criar a sua conta na app

1. Clique **Open Admin** e entre com o **Admin Email** e **Admin Password** mostrados na página da instância (o olho mostra a palavra-passe).
2. Na lista à esquerda, clique em **users** → **+ New record** e preencha:
   - **email:** o seu email
   - **password** e **passwordConfirm:** a sua palavra-passe
   - **name:** o seu nome
   - **papel:** `admin`
   - **verified:** ligado
3. **Create**.

## 4. Entrar na app

1. Abra `https://<o-seu-endereço>.pocketbasecloud.com` e entre com a conta criada no passo 3.
2. Em **Definições**:
   - confirme o nome da associação e o **valor da quota**;
   - indique o **saldo inicial** (dinheiro em caixa + banco hoje);
   - em **Membros da direção**, crie as contas do(a) tesoureiro(a) e dos restantes membros.
3. No telemóvel: abra o endereço → menu do browser → **Adicionar ao ecrã principal**.

## 5. Manter a app acordada (importante)

No plano gratuito, uma instância **sem utilização durante 30 dias é pausada e apagada 15 dias depois**.
Isto pode acontecer nas férias de verão. Para evitar, crie um "despertador" gratuito:

1. Crie conta em <https://uptimerobot.com> (plano Free, com o email da associação).
2. **+ New monitor** → tipo **HTTP(s)**.
3. **URL:** `https://<o-seu-endereço>.pocketbasecloud.com/api/health` (o seu endereço).
4. **Monitoring interval:** 5 minutos (ou o mínimo que o plano gratuito permitir) → **Create monitor**.

O UptimeRobot visita a app regularmente, o que conta como utilização. Além disso, avisa por email se a app deixar de responder.
A PocketBase Cloud também envia emails de aviso antes de pausar: confirme que o email da associação é lido.

## 6. Cartão ao fim de 7 dias

A PocketBase Cloud pede um cartão ao fim de **7 dias**. Segundo o site, serve só para afastar contas falsas e **nunca é cobrado** no plano Free.
Sem cartão, a instância é pausada e deixa de aceitar atualizações. Leia as condições no momento de adicionar o cartão.

---

## Espaço (50 MB)

O plano gratuito tem **50 MB**, contando os dados e as cópias de segurança guardadas na instância.
A app não guarda fotografias nem ficheiros (só o n.º da fatura ou recibo), por isso centenas de sócios, eventos e
movimentos ocupam poucos MB — chega para muitos anos. Guarde as faturas em papel ou na pasta da associação no Google Drive.

## Cópias de segurança (1× por mês)

1. Em `…/_/` → **Settings** → **Backups** → **Initialize new backup**.
2. Quando aparecer na lista, **descarregue-a** (ícone de download) e guarde-a no Google Drive da associação.
3. **Apague a cópia da instância** (ícone de lixo), para não gastar os 50 MB.

Para repor: em **Backups** → **Upload backup** → escolha o ficheiro → **Restore**.

## Atualizar a app

Quando houver uma versão nova:

1. Descarregue o novo `app-associacao.zip` em [Releases](https://github.com/fist23/Associacao-de-pais/releases/tag/app-mais-recente).
2. Na instância: **Deploy** → arraste o ZIP.

A app é substituída e as alterações à base de dados aplicam-se sozinhas. Os dados mantêm-se.

## Palavra-passe esquecida

- **Membro da direção:** o administrador redefine-a em **Definições → Membros da direção**.
- **Administrador:** entre no painel `/_/` com a conta técnica → **users** → abra o registo → altere a password.
- **Conta técnica:** use a opção de redefinição no portal da PocketBase Cloud.
