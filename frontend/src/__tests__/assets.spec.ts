import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AssetsView from '@/views/AssetsView.vue'

vi.mock('@/services', () => ({
  assetService: {
    listAssets: vi.fn(),
    uploadAsset: vi.fn(),
    deleteAsset: vi.fn(),
  },
}))

import { assetService } from '@/services'

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

async function switchToAllFolder(wrapper: ReturnType<typeof mount>) {
  const items = wrapper.findAll('.tree-item')
  await items[0]?.trigger('click')
  await flushPromises()
}

describe('AssetsView', () => {
  let createElementSpy: ReturnType<typeof vi.spyOn> | null = null
  let lastAnchor: HTMLAnchorElement | null = null
  let lastClickSpy: ReturnType<typeof vi.spyOn> | null = null
  const originalCreateElement = document.createElement.bind(document)

  beforeEach(() => {
    ;(assetService.listAssets as any).mockResolvedValue([
      {
        id: '1',
        name: '角色_霍去病.png',
        mimeType: 'image/png',
        size: 1234,
        createdAt: '2026-02-04T10:00:00',
        contentUrl: '/api/assets/1/content',
        downloadUrl: '/api/assets/1/content?download=1',
      },
      {
        id: '2',
        name: 'BGM_战斗.mp3',
        mimeType: 'audio/mpeg',
        size: 4567,
        createdAt: '2026-02-04T10:10:00',
        contentUrl: '/api/assets/2/content',
        downloadUrl: '',
      },
    ])
    ;(assetService.uploadAsset as any).mockResolvedValue({})
    ;(assetService.deleteAsset as any).mockResolvedValue(undefined)

    lastAnchor = null
    lastClickSpy = null
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag.toLowerCase() === 'a') {
        lastAnchor = originalCreateElement('a')
        lastClickSpy = vi.spyOn(lastAnchor, 'click').mockImplementation(() => {})
        return lastAnchor
      }
      return originalCreateElement(tag)
    })
  })

  afterEach(() => {
    createElementSpy?.mockRestore()
    lastClickSpy?.mockRestore()
  })

  it('should disable download button when asset has no url', async () => {
    const wrapper = mount(AssetsView)
    await flushPromises()
    await switchToAllFolder(wrapper)
    const cards = wrapper.findAll('.asset-card')

    const audioCard = cards.find((card) => card.find('.asset-name').text() === 'BGM_战斗.mp3')
    expect(audioCard).toBeTruthy()

    const downloadBtn = audioCard!.find('.asset-actions .btn-mini')
    expect(downloadBtn.attributes('disabled')).toBeDefined()
  })

  it('should trigger download for assets with url', async () => {
    const wrapper = mount(AssetsView)
    await flushPromises()
    await switchToAllFolder(wrapper)
    const cards = wrapper.findAll('.asset-card')

    const imageCard = cards.find((card) => card.find('.asset-name').text() === '角色_霍去病.png')
    expect(imageCard).toBeTruthy()

    const downloadBtn = imageCard!.find('.asset-actions .btn-mini')
    await downloadBtn.trigger('click')

    expect(createElementSpy).toHaveBeenCalled()
    expect(lastAnchor).toBeTruthy()
    expect(lastAnchor?.download).toBe('角色_霍去病.png')
    expect(lastAnchor?.href).toContain('/api/assets/1/content?download=1')
    expect(lastClickSpy).toHaveBeenCalled()
  })
})
