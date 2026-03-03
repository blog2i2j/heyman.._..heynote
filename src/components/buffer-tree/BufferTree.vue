<script>
    import { mapState, mapActions } from "pinia"
    import { SCRATCH_FILE_NAME } from "@/src/common/constants"
    import { useHeynoteStore } from "@/src/stores/heynote-store"

    const pathSep = window.heynote.buffer.pathSeparator

    function fileBaseName(path) {
        const filename = path.split(pathSep).at(-1) || path
        return filename.endsWith(".txt") ? filename.slice(0, -4) : filename
    }

    function compareByName(a, b) {
        return a.name.localeCompare(b.name)
    }

    export default {
        data() {
            return {
                folderOpenState: {},
            }
        },

        async mounted() {
            await this.updateBuffers()
            this.syncFolderOpenState()
            this.$nextTick(() => this.scrollActiveBufferIntoView())
        },

        watch: {
            buffers: {
                deep: true,
                handler() {
                    this.syncFolderOpenState()
                },
            },
            currentBufferPath() {
                this.openCurrentPathFolders()
                this.$nextTick(() => this.scrollActiveBufferIntoView())
            },
        },

        computed: {
            ...mapState(useHeynoteStore, [
                "buffers",
                "currentBufferPath",
            ]),

            visibleItems() {
                const rows = []
                const walk = (folder, level) => {
                    const folders = [...folder.folders].sort(compareByName)
                    const files = [...folder.files].sort(compareByName)
                    for (const childFolder of folders) {
                        rows.push({
                            type: "folder",
                            path: childFolder.path,
                            name: childFolder.name,
                            level,
                            open: !!this.folderOpenState[childFolder.path],
                        })
                        if (this.folderOpenState[childFolder.path]) {
                            walk(childFolder, level + 1)
                        }
                    }
                    for (const file of files) {
                        rows.push({
                            type: "buffer",
                            path: file.path,
                            name: file.name,
                            level,
                            active: file.path === this.currentBufferPath,
                            scratch: file.path === SCRATCH_FILE_NAME,
                        })
                    }
                }

                walk(this.buildTree(), 0)
                return rows
            },
        },

        methods: {
            ...mapActions(useHeynoteStore, [
                "updateBuffers",
                "openBuffer",
            ]),

            buildTree() {
                const root = {
                    path: "",
                    folders: [],
                    files: [],
                }
                const getOrCreateFolder = (parent, name, path) => {
                    let folder = parent.folders.find((item) => item.path === path)
                    if (!folder) {
                        folder = {
                            name,
                            path,
                            folders: [],
                            files: [],
                        }
                        parent.folders.push(folder)
                    }
                    return folder
                }

                for (const [bufferPath, metadata] of Object.entries(this.buffers)) {
                    const parts = bufferPath.split(pathSep)
                    const filename = parts.pop()
                    let current = root
                    let currentPath = ""
                    for (const folderName of parts) {
                        currentPath = currentPath ? currentPath + pathSep + folderName : folderName
                        current = getOrCreateFolder(current, folderName, currentPath)
                    }

                    current.files.push({
                        path: bufferPath,
                        name: metadata?.name || fileBaseName(filename || bufferPath),
                    })
                }
                return root
            },

            getFolderPaths() {
                const folderPaths = []
                for (const path of Object.keys(this.buffers)) {
                    const parts = path.split(pathSep).slice(0, -1)
                    let currentPath = ""
                    for (const folderName of parts) {
                        currentPath = currentPath ? currentPath + pathSep + folderName : folderName
                        folderPaths.push(currentPath)
                    }
                }
                return [...new Set(folderPaths)]
            },

            openCurrentPathFolders() {
                const parts = (this.currentBufferPath || "").split(pathSep).slice(0, -1)
                let currentPath = ""
                for (const folderName of parts) {
                    currentPath = currentPath ? currentPath + pathSep + folderName : folderName
                    this.folderOpenState[currentPath] = true
                }
            },

            syncFolderOpenState() {
                const nextState = {}
                for (const path of this.getFolderPaths()) {
                    nextState[path] = this.folderOpenState[path] ?? false
                }
                this.folderOpenState = nextState
                this.openCurrentPathFolders()
            },

            onFolderClick(path) {
                this.folderOpenState[path] = !this.folderOpenState[path]
            },

            scrollActiveBufferIntoView() {
                const activeBuffer = this.$el?.querySelector(".buffer.active")
                if (!activeBuffer) {
                    return
                }
                activeBuffer.scrollIntoView({
                    behavior: "auto",
                    block: "nearest",
                })
            },
        },

    }
</script>

<template>
    <div class="buffer-tree">
        <div
            v-for="item in visibleItems"
            :key="item.type + ':' + item.path"
            :class="{
                item: true,
                folder: item.type === 'folder',
                buffer: item.type === 'buffer',
                open: item.open,
                active: item.active,
                scratch: item.scratch,
            }"
            :style="{ '--indent-level': item.level }"
            @click="item.type === 'folder' ? onFolderClick(item.path) : openBuffer(item.path)"
        >
            <span class="name" :title="item.name">{{ item.name }}</span>
        </div>
    </div>
</template>

<style lang="sass" scoped>
    .buffer-tree
        height: 100%
        min-height: 0
        max-height: 100%
        overflow-y: auto
        overflow-x: hidden
        padding: 4px 0
        box-sizing: border-box

    .item
        user-select: none
        font-size: 13px
        line-height: 20px
        padding: 2px 10px
        scroll-margin-top: 36px
        scroll-margin-bottom: 36px
        padding-left: calc(22px + var(--indent-level) * 16px)
        //border-radius: 4px
        white-space: nowrap
        overflow: hidden
        text-overflow: ellipsis
        cursor: pointer
        color: rgba(0,0,0, 0.6)
        +dark-mode
            color: rgba(255,255,255, 0.6)
        &.buffer
            &:hover
                background-color: rgba(0,0,0, 0.06)
                +dark-mode
                    background: rgba(255,255,255, 0.08)
            &.active
                background: #c5d9cf
                +dark-mode
                    background: #244233
            &.scratch
                font-style: italic
        &.folder
            background-image: url('@/assets/icons/caret-right.svg')
            background-size: 12px
            background-repeat: no-repeat
            background-position-x: calc(7px + var(--indent-level) * 16px)
            background-position-y: 6px
            +dark-mode
                background-image: url('@/assets/icons/caret-right-white.svg')
            &:hover
                background-color: rgba(0,0,0, 0.06)
                +dark-mode
                    background-color: rgba(255,255,255, 0.08)
            &.open
                background-image: url('@/assets/icons/caret-down.svg')
                +dark-mode
                    background-image: url('@/assets/icons/caret-down-white.svg')

    .name
        display: block
</style>
