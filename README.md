# Photography Portfolio Template

一个简洁的摄影作品集网站模板，基于 Next.js、React、Tailwind CSS 和 Framer Motion。包含响应式画廊、系列分类、滚动品牌导航、About 页面、完整页脚导航，以及支持按钮、方向键和手机滑动的图片预览。

模板仅包含几何占位图，不包含原作者的摄影作品、个人社交账号或原仓库的提交历史。

## 1. 创建自己的项目

如果希望以后接收模板更新，请在本仓库页面点击右上角 **Fork**，在自己的 GitHub 账号下创建 Fork，然后下载或克隆这个 Fork。Fork 会保留与本模板的关联，后续同步最省事。

如果只想复制当前版本，并且以后不需要接收模板更新，可以点击 **Use this template → Create a new repository**。这种方式创建的是独立仓库，GitHub 不会保留可同步关系。

本模板仓库为私有仓库，需要先让仓库所有者邀请你的 GitHub 账号，接受邀请后才能访问和使用。使用说明也可参考 [GitHub 官方模板文档](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template)。

也可以点击 **Code → Download ZIP**，解压后使用；ZIP 同样不会保留可同步关系。

## 2. 同步模板的后续更新

此功能仅适用于通过 **Fork** 创建的项目。

1. 打开你自己的 Fork 仓库页面。
2. 点击文件列表上方的 **Sync fork**。
3. 查看更新内容，然后点击 **Update branch**。
4. 拉取自己仓库的最新版本，在本地运行 `npm ci` 和 `npm run build` 检查。

为了尽量避免冲突，把个人内容放在模板专门提供的文件里：

- 名称和简介：`app/site-config.json`
- 社交账号：`app/social-profiles.json`
- 照片：`public/gallery/`
- 照片标题、说明和顺序：`app/gallery-data.json`
- About 内容：`app/about-content.json`
- 系列分类：`app/gallery-categories.mjs`

模板维护者发布框架更新时，应尽量不改动这些个人内容文件。使用者如果修改 `app/page.js`、组件或样式文件，将来同步相同位置的更新时可能需要手动处理冲突。GitHub 遇到冲突时会提示创建 Pull Request 处理，不会直接覆盖使用者的改动。

本次结构升级保留了旧版的 `site-config.json`、`social-profiles.json`、`gallery-data.json` 和照片目录；新增的 About 默认沿用原有名称、简介及当前画廊第一张图，不要求重新填写。旧照片的 `Photography` 或尚未配置的自定义分类会出现在 Photography 分类页，首页仍展示全部作品。同步后先执行 `npm run check` 与 `npm run build -- --webpack`，确认后再发布自己的站点。模板仓库更新不会自动修改朋友的 Fork。

详细步骤可参考 [GitHub 官方同步 Fork 文档](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/syncing-a-fork)。

## 3. 启动预览

安装 Node.js 20.9 或以上版本（推荐当前仍受支持的 LTS 版本）。在项目文件夹打开终端，执行：

```bash
npm ci
npm run dev
```

打开终端显示的本地地址，通常是 http://localhost:3000 。首次安装依赖及构建时需要联网；项目使用 `next/font` 获取 Google Fonts 的 Archivo 字体。

本模板无需数据库、API 密钥或环境变量即可运行。

## 4. 替换成你的名字和内容

编辑 `app/site-config.json`：

```json
{
  "name": "YOUR STUDIO",
  "tagline": "A collection of moments, places, and perspectives.",
  "description": "A photography portfolio by YOUR STUDIO."
}
```

- `name`：首页、导航、页脚和浏览器标签中的名称。
- `tagline`：首页和页脚的简介。
- `description`：网页描述。

页脚年份会在渲染时使用当前年份。修改配置后重新构建并发布，即可更新线上内容。

社交链接在 `app/social-profiles.json`：

```json
{
  "instagram": "",
  "douyin": "",
  "xiaohongshu": ""
}
```

填入完整的 `https://` 主页链接；留空的平台会自动隐藏。所有链接留空时，联系入口也会隐藏。

### About 页面

在 `app/about-content.json` 修改标题、`introduction`（简介）、`invitation`（引导语）和 `statement`（摄影理念）。`statement` 留空时沿用 `site-config.json` 的 `tagline`；名称始终沿用 `site-config.json` 的 `name`。

`imageSrc` 可填画廊中某张图片的路径；留空或原图片已移除时默认使用当前第一张。`imageAlt`、`imageCaption` 留空时使用照片标题和分类。没有照片时自动采用纯文字布局。平台名称使用英文，但个人简介支持使用你自己的语言。

### 分类与导航

`app/gallery-categories.mjs` 配置系列的 `slug`、`label` 和 `description`。照片 `category` 与 `label` 一致时归入该系列；导航、分类页和页脚共用此配置。`all` 和 `photography` 是保留路径，不能用作自定义 slug；未配置的旧分类统一进入 Photography，原有分类文字不会被重写。

首页保持大字标随滚动收进导航，不常驻分类跳转。模板不会载入原作者的品牌图标；如需 favicon，可自行添加 `app/icon.svg`。

## 5. 添加照片

1. 删除 `public/gallery/` 内的 `sample-*.jpg` 占位图，放入自己的照片。支持 JPG、JPEG、PNG、WebP，也支持子文件夹。建议使用有含义的文件名。
2. 执行 `npm run gallery:sync`，自动读取图片尺寸、判断横竖图并生成清单。
3. 编辑 `app/gallery-data.json`，调整 `title`（标题）、`category`（分类）、`description`（说明）和 `thumbPosition`（缩略图裁切位置，例如 `center` 或 `50% 30%`）。移动整个条目可以调整展示顺序。

已有照片的标题、说明和顺序会在同步时保留。每次 `npm run dev` 和 `npm run build` 前都会自动同步；预览已经运行时，新增或删除照片后手动执行一次 `npm run gallery:sync`。

重命名图片会被当作删除旧图并添加新图，需要重新检查标题与顺序。不要直接修改 `src`、`width`、`height` 和 `isWide`，这些字段由同步脚本维护。

不要把原相机文件直接用于网页。建议先导出适合网页的压缩版本，并移除不想公开的照片位置等元数据。

## 6. 检查并上线

```bash
npm run check
npm run build
npm start
```

如果默认构建器在受限制的运行环境中提示端口权限错误，可以使用 `npm run build -- --webpack` 构建，再执行 `npm start`。

构建成功后，把自己的仓库导入支持 Next.js 的托管平台（例如 Vercel），选择 Next.js 项目并发布。发布后可按平台指引绑定自己的域名。

后续更新照片或文案，需要将照片、`app/gallery-data.json` 和其他改动一起提交到你自己的仓库，并通过你的托管平台发布。是否自动发布，取决于你在该平台的设置。

## 常用文件

| 文件 | 用途 |
| --- | --- |
| `app/site-config.json` | 名称、简介、网页描述 |
| `app/social-profiles.json` | 社交主页链接 |
| `public/gallery/` | 照片 |
| `app/gallery-data.json` | 图片标题、说明、排序 |
| `app/about-content.json` | About 文案与配图选择 |
| `app/gallery-categories.mjs` | 个人系列分类配置 |
| `app/page.js`、`app/components/` | 页面结构与独立交互组件 |
| `app/lib/` | 数据验证、分类逻辑、共享动效与滚动计算 |
| `app/gallery.css` | 画廊布局 |
| `app/navigation.css`、`app/footer.css` | 导航与页脚样式 |
| `app/globals.css` | 全局样式、字体 |

### 动效与维护

统一参数在 `app/lib/motion-tokens.mjs`：颜色反馈 160ms、控件缩放 240ms、面板切换 320ms、桌面展开轻回弹 440ms、内容淡入 600ms、照片淡入／缩放 800–1000ms。只有桌面面板展开允许轻微超调；首页字标、视差和照片入场保留各自的物理弹簧，不能用同一时长取代。

页面、静态画廊和页脚由服务端渲染，灯箱与滚动交互独立为客户端组件。图片只在接近视口时启用视差计算；系统减少动态效果时取消位移、缩放和错峰。About 按段进入，页脚分组标签与可点击项分层，所有链接保留键盘焦点提示。

自动检查覆盖旧分类兼容、空／部分社交配置、About 的默认图片和空图库、字体层级、共享动效、快速切换和滚动恢复。修改个人内容后也应运行检查和构建。

本模板供复制和修改，用于搭建自己的摄影作品集。第三方依赖及社交平台图标遵循各自的许可与品牌规则，图标来源见 `public/icons/SOURCES.md`。
