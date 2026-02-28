<script>
    import { mapState, mapStores } from "pinia"

    import { TITLE_BAR_BG_LIGHT, TITLE_BAR_BG_DARK, TITLE_BAR_BG_LIGHT_BLURRED, TITLE_BAR_BG_DARK_BLURRED } from "@/src/common/constants"
    import { useHeynoteStore } from "@/src/stores/heynote-store"
    import { useSettingsStore } from "@/src/stores/settings-store"

    import MainMenuButton from "./tabs/MainMenuButton.vue"
    import BufferTree from "./buffer-tree/BufferTree.vue"

    export default {
        components: {
            MainMenuButton,
            BufferTree,
        },

        data() {
            return {
                isResizing: false,
                resizeStartX: 0,
                resizeStartWidth: 0,
            }
        },

        mounted() {
            this.$refs.resizer.addEventListener("mousedown", this.onResizerMouseDown)
        },

        beforeUnmount() {
            this.$refs.resizer?.removeEventListener("mousedown", this.onResizerMouseDown)
            window.removeEventListener("mousemove", this.onWindowMouseMove)
            window.removeEventListener("mouseup", this.onWindowMouseUp)
        },

        computed: {
            ...mapState(useHeynoteStore, [
                "isFocused",
            ]),
            ...mapState(useSettingsStore, [
                "theme",
            ]),
            ...mapStores(useHeynoteStore),

            backgroundColor() {
                if (this.theme === "dark") {
                    return this.isFocused ? TITLE_BAR_BG_DARK : TITLE_BAR_BG_DARK_BLURRED
                } else {
                    return this.isFocused ? TITLE_BAR_BG_LIGHT : TITLE_BAR_BG_LIGHT_BLURRED
                }
            },

            style() {
                return {
                    backgroundColor: this.backgroundColor,
                }
            },

            resizerClass() {
                return {
                    resizer: true,
                    resizing: this.isResizing,
                }
            },
        },

        methods: {
            onResizerMouseDown(event) {
                if (event.button !== 0) {
                    return
                }
                event.preventDefault()
                this.isResizing = true
                this.resizeStartX = event.clientX
                this.resizeStartWidth = this.$el.getBoundingClientRect().width
                window.addEventListener("mousemove", this.onWindowMouseMove)
                window.addEventListener("mouseup", this.onWindowMouseUp)
            },

            onWindowMouseMove(event) {
                if (!this.isResizing) {
                    return
                }
                const delta = event.clientX - this.resizeStartX
                const width = this.resizeStartWidth + delta
                const minWidth = 120
                const maxWidth = Math.max(minWidth, Math.min(800, window.innerWidth - 200))
                const clampedWidth = Math.max(minWidth, Math.min(width, maxWidth))
                this.heynoteStore.leftPanelWidth = clampedWidth
            },

            onWindowMouseUp() {
                if (!this.isResizing) {
                    return
                }
                this.isResizing = false
                window.removeEventListener("mousemove", this.onWindowMouseMove)
                window.removeEventListener("mouseup", this.onWindowMouseUp)
            },
        },
    }
</script>

<template>
    <aside class="left-panel" :style="style">
        <div class="top-bar">
            <MainMenuButton />
        </div>
        <div class="left-panel-content">
            <BufferTree />
        </div>
        <div
            :class="resizerClass"
            ref="resizer"
        ></div>
    </aside>
</template>

<style scoped lang="sass">
    .left-panel
        --resizer-color: #2482ce
        +dark-mode
            --resizer-color: #0060c7

        width: var(--left-panel-width)
        flex-shrink: 0
        height: 100%
        min-height: 0
        display: flex
        flex-direction: column
        position: relative

        .top-bar
            height: var(--tab-bar-height)
            flex-shrink: 0
            app-region: drag

        .left-panel-content
            flex-grow: 1
            min-height: 0
            //border-right: 1px solid var(--tab-bar-border-bottom-color)
        
        .resizer
            position: absolute
            top: 0
            right: 0
            bottom: 0
            width: 4px
            background-color: transparent
            transition: background-color 200ms ease
            cursor: col-resize
            &:hover
                background-color: var(--resizer-color)
                transition-delay: 300ms
            &.resizing
                background-color: var(--resizer-color)
</style>
