<!-- partials/file-dialogs.php: the same markup as v2/src/shell/FileDialogs.tsx -->
<template x-if="$store.os.properties">
    <div class="fixed inset-0 z-15000 flex items-center justify-center bg-black/20 p-4"
         @click.self="$store.os.properties = null"
         @keydown.escape.window="$store.os.properties = null"
         @contextmenu.prevent.stop>
        <div role="dialog"
             aria-modal="true"
             :aria-label="`${$store.os.properties.entry.name} Properties`"
             data-properties
             class="w-full max-w-sm rounded-lg border border-black/10 bg-white shadow-2xl text-black dark:border-white/10 dark:bg-[#2b2b2b] dark:text-white">
            <div class="flex items-center justify-between border-b border-black/5 px-4 py-2 dark:border-white/5">
                <span class="truncate text-xs font-semibold" x-text="`${$store.os.properties.entry.name} Properties`"></span>
                <button type="button" @click="$store.os.properties = null" aria-label="Close" class="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-red-500 hover:text-white">×</button>
            </div>
            <div class="space-y-4 p-4">
                <div class="flex items-center space-x-3">
                    <template x-if="($store.os.properties.entry.icon || '').includes('.')">
                        <img :src="$store.os.properties.entry.icon" alt="" class="h-10 w-10 object-contain">
                    </template>
                    <template x-if="!($store.os.properties.entry.icon || '').includes('.')">
                        <span class="text-3xl" x-text="$store.os.properties.entry.icon || '📄'"></span>
                    </template>
                    <span class="min-w-0 break-all text-sm font-medium" x-text="$store.os.properties.entry.name"></span>
                </div>
                <dl class="space-y-2 border-t border-black/5 pt-3 text-xs dark:border-white/5">
                    <template x-for="[label, value] in propertiesRows" :key="label">
                        <div class="grid grid-cols-[6.5rem_1fr] gap-2" :data-property="label">
                            <dt class="opacity-60" x-text="`${label}:`"></dt>
                            <dd class="min-w-0 break-all" x-text="value"></dd>
                        </div>
                    </template>
                </dl>
            </div>
            <div class="flex justify-end border-t border-black/5 p-3 dark:border-white/5">
                <button type="button" @click="$store.os.properties = null" class="min-h-11 rounded-sm bg-win-blue px-8 py-1.5 text-xs text-white hover:brightness-110">OK</button>
            </div>
        </div>
    </div>
</template>

<template x-if="$store.os.toastMessage">
    <div role="status"
         data-os-toast
         class="fixed bottom-16 right-4 z-15000 rounded-lg border border-black/10 bg-white px-4 py-3 text-xs text-black shadow-2xl dark:border-white/10 dark:bg-[#2b2b2b] dark:text-white"
         x-text="$store.os.toastMessage"></div>
</template>
