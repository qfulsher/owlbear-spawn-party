import OBR, { ContextMenuContext, ImageContent, ImageGrid, TextContent, buildImage, Image as OBRImage, Metadata } from "@owlbear-rodeo/sdk";

const ID = "com.tool.owlbearSpawnParty";
const roomMetadataKey = `${ID}/metadata`;
const ctxMenuId = `${ID}/context-menu`;
const toolId = `${ID}/metadata`;
const spawnModeId = `${ID}/spawn`;
const clearActionId = `${ID}/clear`;

function createSpawnPartyTool() {
  OBR.tool.create({
    id: toolId,
    icons: [
      {
        icon: '/groups.svg',
        label: 'Spawn the Party',
        filter: {
          roles: ['GM']
        }
      }
    ],
    disabled: {
      roles: ['PLAYER']
    }
  });

  OBR.tool.createMode({
    id: spawnModeId,
    icons: [
      {
        icon: "/groups.svg",
        label: "Spawn Party",
        filter: {
          activeTools: [toolId],
        },
      },
    ],
    onToolClick(_, event): void {
      const position = event.pointerPosition;
      getPartyMetaData().then(pcData => {
        let xOffset = 0;
        let pcTokens = pcData.map(pc => {
          const token = buildImage(pc.image, pc.grid)
            .layer('CHARACTER')
            .name(pc.name)
            .position({
              x: position.x + xOffset,
              y: position.y
            }).build();

          xOffset += pc.image.width;

          return token;
        });

        return OBR.scene.items.addItems(pcTokens);
      })
    },
  });

  OBR.tool.createAction({
    id: clearActionId,
    icons: [
      {
        icon: "/group-remove.svg",
        label: "Reset Party Members",
        filter: {
          activeTools: [toolId],
        },
      },
    ],
    onClick(): void {
      let blankMetaData: Partial<Metadata> = {};
      blankMetaData[roomMetadataKey] = [];
      OBR.room.setMetadata(blankMetaData).then(() => {
        return OBR.notification.show("Party tokens cleared.", "INFO");
      });
    }
  });
}

async function getPartyMetaData(): Promise<PartyTokenInfo[]> {
  const metaData = await OBR.room.getMetadata();
  return (metaData[roomMetadataKey] || []) as PartyTokenInfo[];
}

function createMarkTokenAsPcCtxMenuAction() {
  OBR.contextMenu.create({
    id: ctxMenuId,
    icons: [
      {
        icon: "/group-add.svg",
        label: "Add to Party",
        filter: {
          every: [{ key: "layer", value: "CHARACTER" }],
        },
      },
    ],
    onClick(ctx: ContextMenuContext): void {
      let tokenNames: string;
      OBR.room.getMetadata().then(metaData => {
        let partyTokens = (metaData[roomMetadataKey] || []) as PartyTokenInfo[];

        let selectedTokens = ctx.items.filter(i => i.type === 'IMAGE') as (OBRImage[]);
        let newPartyTokens: PartyTokenInfo[] = selectedTokens
          .filter(i => partyTokens.findIndex((t) => i.name === t.name) === -1)
          .map((i: OBRImage): PartyTokenInfo => ({
            grid: i.grid,
            image: i.image,
            name: i.name,
            text: i.text
          }));

        tokenNames = newPartyTokens.map(p => p.name).join(', ');

        partyTokens.push(...newPartyTokens);

        metaData[roomMetadataKey] = partyTokens;

        return OBR.room.setMetadata(metaData);
      }).then(() => {
        if (tokenNames && tokenNames.length) {
          OBR.notification.show(`Tokens: ${tokenNames} were added to party.`, "INFO");
        }
      });
    },
  });
}

interface PartyTokenInfo {
  image: ImageContent
  text: TextContent;
  grid: ImageGrid,
  name: string
}

OBR.onReady(() => {
  createSpawnPartyTool();
  createMarkTokenAsPcCtxMenuAction();
});