# Photography Portfolio Template

一个简洁的摄影作品集网站模板，基于 Next.js、React、Tailwind CSS 和 Framer Motion。包含响应式画廊、滚动动画、图片放大预览和社交主页入口。

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

模板维护者发布框架更新时，应尽量不改动这些个人内容文件。使用者如果修改 `app/page.js`、组件或样式文件，将来同步相同位置的更新时可能需要手动处理冲突。GitHub 遇到冲突时会提示创建 Pull Request 处理，不会直接覆盖使用者的改动。

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

## 5. 添加照片

1. 删除 `public/gallery/` 内的 `sample-*.jpg` 占位图，放入自己的照片。支持 JPG、JPEG、PNG、WebP，也支持子文件夹。建议使用有含义的文件名。
2. 执行 `npm run gallery:sync`，自动读取图片尺寸、判断横竖图并生成清单。
3. 编辑 `app/gallery-data.json`，调整 `title`（标题）、`category`（分类）、`description`（说明）和 `thumbPosition`（缩略图裁切位置，例如 `center` 或 `50% 30%`）。移动整个条目可以调整展示顺序。

已有照片的标题、说明和顺序会在同步时保留。每次 `npm run dev` 和 `npm run build` 前都会自动同步；预览已经运行时，新增或删除照片后手动执行一次 `npm run gallery:sync`。

重命名图片会被当作删除旧图并添加新图，需要重新检查标题与顺序。不要直接修改 `src`、`width`、`height` 和 `isWide`，这些字段由同步脚本维护。

不要把原相机文件直接用于网页。建议先导出适合网页的压缩版本，并移除不想公开的照片位置等元数据。

## 6. 检查并上线

```bash
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
| `app/page.js` | 页面结构和动画 |
| `app/gallery.css` | 画廊布局 |
| `app/globals.css` | 全局样式、字体 |

本模板供复制和修改，用于搭建自己的摄影作品集。第三方依赖及社交平台图标遵循各自的许可与品牌规则，图标来源见 `public/icons/SOURCES.md`。
