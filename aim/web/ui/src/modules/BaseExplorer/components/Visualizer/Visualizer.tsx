import * as React from 'react';
import _ from 'lodash-es';

import { Tooltip } from '@material-ui/core';

import { Text } from 'components/kit';

import { buildObjectHash } from 'modules/core/utils/hashing';
import { GroupType } from 'modules/core/pipeline';
import { IQueryableData } from 'modules/core/pipeline';

import contextToString from 'utils/contextToString';

import { IVisualizationProps } from '../../types';
import BoxVirtualizer from '../BoxVirtualizer';
import BoxWrapper from '../BoxWrapper';
import RangePanel from '../RangePanel';

import { useDepthMap } from './hooks';

import './Visualizer.scss';

function Visualizer(props: IVisualizationProps) {
  const {
    engine,
    engine: { useStore, pipeline, visualizations, groupings, depthMap },
    name,
    box: BoxContent,
    boxStacking,
    panelRenderer,
  } = props;

  const foundGroups = useStore(pipeline.foundGroupsSelector);
  const dataState = useStore(pipeline.dataSelector);
  const rangesData: IQueryableData = useStore(pipeline.queryableDataSelector);

  const vizEngine = visualizations[name];
  const boxConfig = useStore(vizEngine.box.stateSelector);

  const data = React.useMemo(() => {
    return dataState?.map((d: any, i: number) => {
      const groupTypes = Object.keys(d.groups || {});
      const groupInfo: Record<string, object> = {};
      if (foundGroups) {
        groupTypes.forEach((groupType) => {
          const group = foundGroups[d.groups[groupType]];
          if (group) {
            groupInfo[groupType] = {
              key: group.key,
              config: group.fields,
              items_count_in_group: group.items.length,
              order: group.order,
            };
          }
        });
      }

      // calculate styles by position
      // get style applier of box  from engine
      // listen to found groups
      function applyStyles(obj: any, group: any, iteration: number) {
        let style = {};
        groupings.styleAppliers.forEach((applier: any) => {
          style = {
            ...style,
            ...applier(obj, group, boxConfig, iteration),
          };
        });

        return style;
      }

      return {
        ...d,
        groupInfo,
        groupKey: buildObjectHash(groupInfo),
        style: {
          width: boxConfig.width,
          height: boxConfig.height,
          ...applyStyles(d, groupInfo, i),
        },
      };
    });
  }, [dataState, foundGroups, boxConfig, groupings.styleAppliers]);

  // FOR ROWS
  const rowsAxisData = React.useMemo(() => {
    if (foundGroups) {
      return Object.keys(foundGroups)
        .filter((key: string) => foundGroups[key].type === GroupType.ROW)
        .map((key: string) => {
          const item = foundGroups[key];
          return {
            key: key,
            value: contextToString(item.fields),
            style: {
              position: 'absolute',
              top:
                item.order * (boxConfig.height + boxConfig.gap) +
                boxConfig.gap -
                boxConfig.gap / 2,
              left: -1,
              height: boxConfig.height + boxConfig.gap,
              width: 200,
              padding: `${boxConfig.gap / 2 / 16 + 0.5}rem 0.5rem`,
              backgroundColor: '#fff',
              boxShadow: 'inset 0 -1px 0 0 #b5b9c5',
              overflow: 'hidden',
              textAlign: 'right',
              textOverflow: 'ellipsis',
              lineHeight: '0.875rem',
              zIndex: foundGroups[key].order,
            },
          };
        });
    }
  }, [foundGroups, boxConfig]);

  // FOR COLUMNS
  const columnsAxisData = React.useMemo(() => {
    if (foundGroups) {
      return Object.keys(foundGroups)
        .filter((key: string) => foundGroups[key].type === GroupType.COLUMN)
        .map((key: string) => {
          const item = foundGroups[key];
          return {
            key: key,
            value: contextToString(item.fields),
            style: {
              position: 'absolute',
              top: -1,
              left:
                item.order * (boxConfig.width + boxConfig.gap) +
                (rowsAxisData && rowsAxisData.length > 0 ? 200 : 0) +
                boxConfig.gap -
                boxConfig.gap / 2,
              height: 30,
              width: boxConfig.width + boxConfig.gap,
              padding: '0.25rem 0.5rem',
              backgroundColor: '#fff',
              boxShadow: '-1px 0 0 0 #b5b9c5',
              textAlign: 'center',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              zIndex: foundGroups[key].order,
            },
          };
        });
    }
  }, [foundGroups, boxConfig, rowsAxisData]);

  const { depthSelector, onDepthMapChange } = useDepthMap({
    data: dataState,
    state: depthMap,
    deps: [dataState, foundGroups],
  });

  return (
    <div className='Visualizer'>
      {panelRenderer()}
      <div className='VisualizerContainer'>
        {!_.isEmpty(dataState) && (
          <BoxVirtualizer
            data={data}
            itemsRenderer={([boxId, boxItems], boxIndex) => (
              <BoxWrapper
                key={boxId}
                boxId={boxId}
                boxIndex={boxIndex}
                boxItems={boxItems}
                engine={engine}
                component={BoxContent}
                visualizationName={name}
                boxStacking={boxStacking}
                depthSelector={depthSelector}
                onDepthMapChange={onDepthMapChange}
              />
            )}
            offset={boxConfig.gap}
            axisData={{
              columns: columnsAxisData,
              rows: rowsAxisData,
            }}
            axisItemRenderer={{
              columns: (item) => (
                <Tooltip key={item.key} title={item.value}>
                  <div style={item.style}>
                    <Text>{item.value}</Text>
                  </div>
                </Tooltip>
              ),
              rows: (item) => (
                <div key={item.key} style={item.style}>
                  <Tooltip title={item.value}>
                    <span>
                      <Text>{item.value}</Text>
                    </span>
                  </Tooltip>
                </div>
              ),
            }}
          />
        )}
      </div>
      {!_.isEmpty(rangesData) && (
        <RangePanel engine={engine} rangesData={rangesData} />
      )}
    </div>
  );
}

Visualizer.displayName = 'Visualization';

export default Visualizer;
