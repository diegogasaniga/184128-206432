# Entrega 2 — Contrato Multisig

Proyecto realizado por:

- Diego Gasaniga - 181428
- Juan Pablo Barrios - 206432

---

## Diseño del Contrato

**Signers fijos:** la lista de signers se pasa al constructor y no puede modificarse después del despliegue. Esta elección simplifica el contrato, elimina superficie de ataque en funciones de gestión de signers, y es suficiente para el propósito de esta entrega.

El flujo es:

1. **Proponer** — cualquier signer propone una transacción (destino, valor ETH, calldata).
2. **Aprobar** — cada signer aprueba independientemente (no se puede aprobar dos veces).
3. **Ejecutar** — cuando se alcanzan `threshold` aprobaciones, cualquier signer puede ejecutar.
4. **Cancelar** — el proponente original puede cancelar antes de que se ejecute.

---

## Estructura del Repositorio

```
Entrega_2/
  contracts/          ← Contrato Solidity
    Multisig.sol
  scripts/            ← Scripts de despliegue
    deploy.ts
  test/               ← Suite de tests
    Multisig.test.ts
  hardhat.config.ts
  package.json
  .env.example
  frontend/           ← Interfaz React
    src/
      abi/            ← ABI del contrato
      components/     ← ContractInfo, ProposalList, ProposalCard, NewProposalForm
      config/         ← Configuración wagmi/RainbowKit
    package.json
    ...
```

---

## 1. Contrato — Compilar, Testear y Desplegar

### Requisitos

- Node.js ≥ 18
- Una cuenta en [Infura](https://infura.io/) o [Alchemy](https://alchemy.com/) para el RPC de Sepolia
- ETH de testnet en Sepolia ([faucet](https://sepoliafaucet.com/))

### Instalar dependencias

```bash
cd Entrega_2
npm install
```

### Compilar

```bash
npm run compile
```

### Correr los tests

```bash
npm run test
```

Los tests cubren: proponer, aprobar, ejecutar, cancelar, y el rechazo de duplicados y no-signers.

### Configurar el despliegue

1. Copiá `.env.example` a `.env` y completá los valores:

```bash
cp .env.example .env
```

```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/TU_KEY
PRIVATE_KEY=tu_clave_privada
ETHERSCAN_API_KEY=tu_api_key_de_etherscan
```

2. En `scripts/deploy.ts` reemplazá las direcciones de los signers y el threshold según tu configuración.

### Desplegar en Sepolia

```bash
npm run deploy:sepolia
```

El script imprimirá la dirección del contrato y el valor de `VITE_CONTRACT_ADDRESS` que debés agregar al `.env` del frontend.

---

## 2. Frontend — Ejecutar Localmente

### Instalar dependencias

```bash
cd Entrega_2/frontend
npm install
```

### Configurar variables de entorno

```bash
cp .env.example .env
```

Completá el `.env`:

```
VITE_WALLETCONNECT_PROJECT_ID=t60bc9b4671ad1a5e2c2c42b7241b62a0
VITE_CONTRACT_ADDRESS=0xDireccionDelContratoEnSepolia
VITE_APP_NAME=Multisig
```

> Podés obtener un `projectId` de WalletConnect en [cloud.walletconnect.com](https://cloud.walletconnect.com/).

### Iniciar el servidor de desarrollo

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173`.

---

## 3. Contrato en Sepolia

| Campo | Valor |
|-------|-------|
| Dirección del contrato | `0x1A77f0a186bEa508A981dAA28a23C54B8892356A` |
| Red | Sepolia Testnet (chainId 11155111) |
| Threshold | 2 de 3 |

### Wallets Signers

| # | Dirección |
|---|-----------|
| 1 | `0x447b46E7a4C959fE30eBCdF01eA2B83eDFC2FC8a` |
| 2 | `0x1066594e4483AE78eb21ECE5F475f8f9b5c8224d` |
| 3 | `0x5478eEE9fbe0c2a994395A1848c62583F376fa2F` |

---

## Interacción de Ejemplo

1. Conectar billetera signer en la UI.
2. Crear una propuesta en el **Formulario de Nueva Propuesta**.
3. Desde una segunda cuenta signer, conectarse y **Aprobar** la propuesta.
4. Una vez alcanzado el threshold, presionar **Ejecutar**.

La UI se actualiza automáticamente (polling cada 5 segundos) y luego de cada transacción confirmada.
