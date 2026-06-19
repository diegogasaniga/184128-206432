# Job Marketplace — Entrega Final

Marketplace de empleos sobre Ethereum, inspirado en ERC-8183 (Agentic Commerce Protocol). Permite que un **cliente** publique un trabajo con escrow en ERC-20, un **proveedor** lo acepte y entregue, y un **evaluador** libere el pago o reembolse al cliente.

---

## Contratos en Sepolia

| Contrato | Dirección |
|---|---|
| MockERC20 (MKT) | _completar tras deploy_ |
| JobMarketplace | _completar tras deploy_ |

---

## Correr los tests

```bash
cd EntregaFinal
npm install
npx hardhat test
```

Los tests cubren:
- **Happy path**: `createJob` → `fund` → `submit` → `complete`
- **Rechazo**: cliente en Open, evaluador en Funded, evaluador en Submitted
- **Expiración**: `claimRefund` desde Funded y desde Submitted
- **Control de acceso**: cada función restringida revierte con dirección incorrecta
- **Multisig como evaluador**: deploy del Multisig de Entrega 2, asignado como evaluador, `complete` solo tiene éxito tras alcanzar el threshold

---

## Correr el frontend localmente

### 1. Deploy del contrato (en hardhat local o Sepolia)

```bash
# Hardhat local
npx hardhat node &
npx hardhat run scripts/deploy.ts --network localhost

# Sepolia
copy .env.example .env
# editar .env con tus claves
npx hardhat run scripts/deploy.ts --network sepolia
```

### 2. Configurar el frontend

```bash
cd frontend
copy .env.example .env
```

Editar `frontend/.env`:
```
VITE_JOB_MARKETPLACE_ADDRESS=0x...  # dirección del deploy
VITE_TOKEN_ADDRESS=0x...            # dirección del MockERC20
VITE_MULTISIG_ADDRESS=0x...         # dirección del Multisig de Entrega 2 (opcional)
VITE_WALLETCONNECT_PROJECT_ID=...   # desde cloud.walletconnect.com
VITE_APP_NAME=Job Marketplace
VITE_DEPLOY_BLOCK=0                 # block del deploy (importante en Sepolia)
VITE_PINATA_JWT=...                 # JWT de Pinata para IPFS uploads
```

Para obtener el block number de deploy: en [Sepolia Etherscan](https://sepolia.etherscan.io), buscar la dirección del contrato o el hash de la transacción de deploy → campo **Block**. Usar ese número entero como valor. Con `0` el frontend escanea desde el bloque génesis, lo que puede ser muy lento en Sepolia y consumir rate-limits del RPC.

`VITE_DEPLOY_BLOCK` debe actualizarse cuando:
- **Se redeploya el contrato** — al hacer un nuevo deploy en Sepolia, el número de bloque cambia; dejar el valor anterior haría que el frontend busque eventos donde no existen, o salte jobs creados antes del nuevo bloque.
- **Se cambia de red o entorno** — en Hardhat local el valor `0` es correcto (cadena corta). Al pasar a Sepolia hay que poner el bloque real del deploy.

Para obtener un JWT de Pinata: https://app.pinata.cloud → API Keys → New Key.

`VITE_PINATA_JWT` debe actualizarse cuando:
- **Expiró el JWT actual** — Pinata emite JWTs con fecha de expiración; si los uploads fallan con 401, generar uno nuevo en el mismo panel.
- **Se revocó la API key** — si se borró o deshabilitó la key en Pinata, todas las variables que usen ese JWT dejan de funcionar.
- **Se quiere usar otra cuenta de Pinata** — por ejemplo, al pasar de un entorno de desarrollo a uno de producción con una cuenta diferente.

### 3. Iniciar el frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Decisiones de diseño

### Contrato

**ERC-20 inmutable en el deploy**
El token se fija en el constructor para mantener el escrow simple y predecible. Un único marketplace por token evita problemas de mezcla de fondos.

**Errores personalizados sobre strings de revert**
Todos los errores usan `error` custom (ej. `NotClient()`, `InvalidStatus(Status)`). Son más gas-eficientes y más claros en el ABI.

**ReentrancyGuard en funciones que mueven fondos**
`fund`, `complete`, `reject` y `claimRefund` tienen el modificador `nonReentrant`. `submit` y `setProvider` no mueven fondos, por lo que no lo necesitan.

**`claimRefund` sin control de acceso ni lógica adicional**
Puede ser llamada por cualquier cuenta. No hay `onlyClient` ni checks extra que pudieran bloquearla. Esto garantiza que los fondos siempre puedan ser recuperados tras la expiración.

**`reject` unificado en un solo selector**
En lugar de dos funciones separadas, `reject` detecta el estado actual y aplica la lógica correspondiente:
- En `Open`: solo el cliente puede, no hay refund (no hay fondos en escrow).
- En `Funded`/`Submitted`: solo el evaluador puede, reembolsa al cliente.

**Multisig como evaluador (surge naturalmente del protocolo)**
El Multisig de la Entrega 2 puede ser asignado como `evaluator`. Para ejecutar `complete`, los signers proponen el calldata a través del Multisig, aprueban hasta alcanzar el threshold, y ejecutan. No requiere ninguna integración adicional en `JobMarketplace`.

**Proveedor opcional en `createJob`**
El cliente puede crear un trabajo sin proveedor y asignarlo después con `setProvider`. Una vez que el trabajo pasa a `Funded`, el proveedor queda fijo.

### Frontend

**Extensión de Entregas 1 y 2**
El dashboard incorpora los paneles de entregas anteriores:
- **Entrega 1**: `AccountPanel` (wallet, saldo ETH, bloque actual, ENS) y `TokensPanel` (saldos ERC-20 incluyendo MKT) visibles en la pantalla principal.
- **Entrega 2**: `MultisigPanel` (ContractInfo + ProposalList + ProposalCard + NewProposalForm) visible en el dashboard cuando `VITE_MULTISIG_ADDRESS` está configurado.

**React Router** para navegación entre las tres pantallas (tablero, detalle, crear).

**IPFS para deliverables vía Pinata**

Pinata se usa únicamente cuando el proveedor envía su entrega (transición `Funded → Submitted`). El flujo es:

1. El proveedor escribe el texto del deliverable en el formulario.
2. El frontend sube el texto como `deliverable.txt` a Pinata vía `POST https://api.pinata.cloud/pinning/pinFileToIPFS` usando el JWT configurado en `VITE_PINATA_JWT`.
3. Pinata retorna un CID (Content Identifier). El CID se guarda en `localStorage` (clave `ipfs_cid_{jobId}`) para que el proveedor pueda consultarlo en la misma sesión de navegador.
4. El frontend hashea el CID: `deliverableRef = keccak256(stringToHex(cid))` y llama a `submit(jobId, deliverableRef)` on-chain. El contrato solo almacena ese hash de 32 bytes — nunca el contenido en sí.

Para que el evaluador acceda al contenido:
- El proveedor le comunica el CID por fuera de la cadena (off-chain).
- El evaluador ingresa el CID en el panel de acciones. El frontend recupera el texto desde `https://gateway.pinata.cloud/ipfs/{cid}` y lo muestra en pantalla.
- El evaluador puede verificar el vínculo: `keccak256(cid)` debe coincidir con el `deliverableRef` almacenado on-chain.

El contenido es inmutable y accesible desde cualquier gateway IPFS público usando el CID; no depende de Pinata una vez publicado.

**Approve + Fund en dos transacciones secuenciales**
Al hacer clic en "Fondear Trabajo", primero se verifica el allowance. Si es insuficiente, se envía `approve` y se espera confirmación antes de enviar `fund`. El usuario ve dos prompts de wallet con etiquetas claras.

**Invalidación de queries tras confirmación**
Cada acción exitosa llama a `refetch()` en el componente de detalle, que llama a `useReadContract` con el estado actualizado. No se recarga la página.

**Errores en lenguaje claro**
Se extrae `shortMessage` del error de viem (que parsea custom errors del ABI) y se muestra en un banner rojo sobre el botón que lo generó.

---

## Desvíos de la especificación

**`reject` acepta `bytes32 reason`**
La especificación muestra `reject(jobId, reason)` sin tipo explícito. Se implementa como `bytes32` siguiendo la consistencia con `complete(jobId, reason)`.

**`setProvider` solo funciona si el proveedor es `address(0)`**
El spec dice "trabajo Open que aún no tiene proveedor". Se verifica `job.provider != address(0)` y revierte con `ProviderAlreadySet`. Esto impide sobrescribir un proveedor ya asignado (incluso si fue asignado en `createJob`).

**IPFS como storage de deliverables**
Se usa IPFS vía Pinata en lugar de localStorage. El contenido es inmutable, público y accesible desde cualquier gateway IPFS usando el CID. El `deliverableRef` bytes32 on-chain es `keccak256(cid)` — un compromiso criptográfico que vincula el contrato con el contenido en IPFS. El evaluador accede al contenido desde cualquier navegador ingresando el CID.
