
  # Sistema de Gerenciamento de Restaurante

Este projeto foi reorganizado para melhorar a manutenção e a escalabilidade do sistema de gestão de restaurante.

## Como executar

1. Instale as dependências com `corepack pnpm install`.
2. Inicie o ambiente de desenvolvimento com `corepack pnpm dev`.
3. Para gerar a build de produção, use `corepack pnpm build`.

## Destaques da refatoração

- Separação da navegação em um módulo dedicado.
- Extração do hook de tema escuro para reduzir o acoplamento do componente principal.
- Ajustes de configuração de pacotes para facilitar a instalação em ambientes limpos.
  