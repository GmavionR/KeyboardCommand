# 确认默认白名单中的具体扩展名

Type: grilling
Status: resolved
Blocked by: 09

## 问题

依据已确认的范围，为源码、配置、文档和脚本分别列出默认纳入的扩展名及特殊文件名，并确定默认生成文件排除规则。

## 答案

文件是否可选由全局可编辑的名称白名单决定，判定方式为「文件名包含规则文本即命中」（见 [issue 51](51-substring-rule-matching.md)）。符合白名单的文件可以显示、选择和复制。

> 下面这份长清单是通配符时代的原始决定，已被 issue 51 取代。包含语义下一条规则即可覆盖一族扩展名，因此实际默认白名单收敛为 13 条常见文本文件规则：`.ts`、`.js`、`.md`、`.css`、`.html`、`.sql`、`.py`、`.rs`、`.go`、`.yaml`、`.yml`、`Dockerfile`、`.env.example`。其中 `.ts` 覆盖 `.tsx`，`.js` 覆盖 `.jsx`/`.json`/`.jsonc`/`.json5`，`.md` 覆盖 `.mdx`，`.py` 覆盖 `.pyi`。注意 `.mjs`/`.cjs`/`.mts`/`.cts` 并不包含 `.js`/`.ts`（中间隔了一个字母），需要时得单独添加。清单以 `src/data/defaultSettings.ts` 为准。

<details>
<summary>通配符时代的原始清单（已被取代，仅存档）</summary>

- 源码：`.rs`、`.ts`、`.tsx`、`.js`、`.jsx`、`.mjs`、`.cjs`、`.py`、`.pyi`、`.go`、`.java`、`.kt`、`.kts`、`.cs`、`.c`、`.h`、`.cc`、`.cpp`、`.cxx`、`.hpp`、`.hxx`、`.swift`、`.dart`、`.rb`、`.php`、`.lua`、`.scala`、`.ex`、`.exs`、`.hs`、`.clj`、`.cljs`、`.r`、`.pl`、`.sql`、`.proto`、`.graphql`、`.gql`、`.prisma`。
- Web 与样式：`.html`、`.css`、`.scss`、`.sass`、`.less`、`.vue`、`.svelte`。
- 配置：`.json`、`.jsonc`、`.json5`、`.yaml`、`.yml`、`.toml`、`.ini`、`.cfg`、`.conf`、`.properties`、`.xml`、`.gradle`、`.tf`、`.hcl`。
- 文档：`.md`、`.mdx`、`.txt`、`.rst`、`.adoc`。
- 脚本：`.sh`、`.bash`、`.zsh`、`.fish`、`.ps1`、`.psm1`、`.psd1`、`.bat`、`.cmd`。
- 常见密钥文本扩展名：`.pem`、`.key`。
- 特殊文件名：`Dockerfile`、`Containerfile`、`Makefile`、`GNUmakefile`、`CMakeLists.txt`、`Justfile`、`Procfile`、`Gemfile`、`Rakefile`、`Brewfile`、`Vagrantfile`、`Pipfile`、`go.mod`、`go.work`、`.editorconfig`、`.gitignore`、`.gitattributes`、`.gitmodules`、`.dockerignore`、`.npmignore`、`.nvmrc`、`.python-version`、`.ruby-version`、`.tool-versions`、`.env` 与 `.env.*`、`.npmrc`、`.pypirc`、`.netrc`、`.git-credentials`、`credentials.*`、`secrets.*`、`id_rsa`、`id_ed25519`、`id_ecdsa`、`id_dsa`。

</details>

敏感文本文件（包括环境配置和密钥文件）按普通白名单文件处理，不做硬编码排除，也不扫描正文检测疑似密钥。用户需要隐藏特定文件时，使用单独的全局可编辑名称排除规则；该规则在白名单之后生效。其匹配语法见 [issue 51](51-substring-rule-matching.md)，目录后代行为、树中呈现及对搜索和历史恢复的影响由 [issue 29](29-file-exclusion-rules.md) 决定。二进制文件不纳入默认白名单。

默认排除规则收敛为 6 条：`.lock`、`.min.js`、`.map`、`.tsbuildinfo`、`.DS_Store`、`Thumbs.db`。`.lock` 一条即覆盖 `package-lock.json`、`pnpm-lock.yaml`、`yarn.lock`、`Cargo.lock`、`poetry.lock`、`uv.lock`、`Gemfile.lock`、`composer.lock`；`.map` 覆盖各类 sourcemap。原清单中的 `go.sum`、`.pyc`、`.class` 等二进制或不在白名单内的产物无需单列。依赖目录、构建目录等目录级默认规则由 [issue 27](27-ignored-directory-defaults.md) 决定。

本期只依据名称规则筛选，不进行文件内容密钥扫描。

## Comments

- [issue 51](51-substring-rule-matching.md) 把匹配语义改为「名称包含即命中」，本票据的长清单随之收敛；原始清单保留在上方折叠块中存档。
