/*
Copyright 2019-2022 The Tekton Authors
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hot } from 'react-hot-loader/root';
import {
  Link,
  Redirect,
  Route,
  HashRouter as Router,
  Switch
} from 'react-router-dom';

import { IntlProvider, useIntl } from 'react-intl';
import { Content, InlineNotification } from 'carbon-components-react';

import {
  Header,
  LoadingShell,
  LogoutButton,
  PageErrorBoundary
} from '@tektoncd/dashboard-components';
import {
  ALL_NAMESPACES,
  getErrorMessage,
  paths,
  urls,
  useWebSocketReconnected
} from '@tektoncd/dashboard-utils';

import {
  About,
  ClusterInterceptors,
  ClusterTasks,
  ClusterTriggerBinding,
  ClusterTriggerBindings,
  CreatePipelineResource,
  CreatePipelineRun,
  CreateTaskRun,
  CustomResourceDefinition,
  EventListener,
  EventListeners,
  Extension,
  Extensions,
  HeaderBarContent,
  ImportResources,
  NamespacedRoute,
  NotFound,
  PipelineResource,
  PipelineResources,
  PipelineRun,
  PipelineRuns,
  Pipelines,
  ReadWriteRoute,
  ResourceList,
  Run,
  Runs,
  Settings,
  SideNav,
  TaskRun,
  TaskRuns,
  Tasks,
  Trigger,
  TriggerBinding,
  TriggerBindings,
  Triggers,
  TriggerTemplate,
  TriggerTemplates
} from '..';

import {
  NamespaceContext,
  useExtensions,
  useLogoutURL,
  useNamespaces,
  useProperties,
  useTenantNamespace
} from '../../api';

import config from '../../../config_frontend/config.json';

import '../../scss/App.scss';

const { default: defaultLocale, supported: supportedLocales } = config.locales;

/* istanbul ignore next */
const ConfigErrorComponent = ({ loadingConfigError }) => {
  const intl = useIntl();
  if (!loadingConfigError) {
    return null;
  }

  return (
    <InlineNotification
      kind="error"
      title={intl.formatMessage({
        id: 'dashboard.app.loadingConfigError',
        defaultMessage: 'Error loading configuration'
      })}
      subtitle={getErrorMessage(loadingConfigError)}
      lowContrast
    />
  );
};

const ConfigError = ConfigErrorComponent;

async function loadMessages(lang) {
  const isSupportedLocale = supportedLocales.includes(lang);
  const targetLocale = isSupportedLocale ? lang : defaultLocale;
  const { default: loadedMessages } = await import(
    /* webpackChunkName: "[request]" */ `../../nls/messages_${targetLocale}.json`
  );
  /* istanbul ignore next */
  if (process.env.I18N_PSEUDO) {
    const startBoundary = '[[%';
    const endBoundary = '%]]';
    // Make it easier to identify untranslated strings in the UI
    Object.keys(loadedMessages).forEach(loadedLang => {
      const messagesToDisplay = loadedMessages[loadedLang];
      Object.keys(messagesToDisplay).forEach(messageId => {
        if (messagesToDisplay[messageId].startsWith(startBoundary)) {
          // avoid repeating the boundaries when
          // hot reloading in dev mode
          return;
        }
        messagesToDisplay[
          messageId
        ] = `${startBoundary}${messagesToDisplay[messageId]}${endBoundary}`;
      });
    });
  }

  return loadedMessages;
}

function HeaderNameLink(props) {
  return <Link {...props} to={urls.about()} />;
}

/* istanbul ignore next */
export function App({ lang }) {
  const [isSideNavExpanded, setIsSideNavExpanded] = useState(true);
  const [selectedNamespace, setSelectedNamespace] = useState(ALL_NAMESPACES);
  const [namespacedMatch, setNamespacedMatch] = useState(null);

  const {
    error: propertiesError,
    isFetching: isFetchingProperties,
    isPlaceholderData: isPropertiesPlaceholder
  } = useProperties();
  const logoutURL = useLogoutURL();
  const tenantNamespace = useTenantNamespace();

  const {
    data: messages,
    error: messagesError,
    isFetching: isFetchingMessages,
    isPlaceholderData: isMessagesPlaceholder
  } = useQuery(['i18n', lang], () => loadMessages(lang), {
    placeholderData: {}
  });

  const showLoadingState = isPropertiesPlaceholder || isMessagesPlaceholder;
  const isFetchingConfig = isFetchingProperties || isFetchingMessages;

  const { data: extensions = [], isWebSocketConnected } = useExtensions(
    { namespace: tenantNamespace || ALL_NAMESPACES },
    { enabled: !isFetchingConfig }
  );

  const loadingConfigError = propertiesError || messagesError;

  const queryClient = useQueryClient();

  useNamespaces({
    enabled: !isFetchingConfig && !tenantNamespace
  });
  useWebSocketReconnected(
    () => queryClient.invalidateQueries(),
    isWebSocketConnected
  );

  useEffect(() => {
    if (!isFetchingConfig && tenantNamespace) {
      setSelectedNamespace(tenantNamespace);
    }
  }, [isFetchingConfig, tenantNamespace]);

  const logoutButton = <LogoutButton getLogoutURL={() => logoutURL} />;

  const namespaceContext = useMemo(
    () => ({
      namespacedMatch,
      selectedNamespace,
      selectNamespace: setSelectedNamespace,
      setNamespacedMatch
    }),
    [namespacedMatch, selectedNamespace]
  );

  return (
    <NamespaceContext.Provider value={namespaceContext}>
      <IntlProvider
        defaultLocale={defaultLocale}
        locale={messages[lang] ? lang : defaultLocale}
        messages={messages[lang]}
      >
        <ConfigError loadingConfigError={loadingConfigError} />

        {showLoadingState && <LoadingShell />}
        {!showLoadingState && (
          <Router>
            <>
              <Route path={paths.byNamespace({ path: '/*' })}>
                {() => (
                  <>
                    <Header
                      headerNameProps={{
                        element: HeaderNameLink
                      }}
                      isSideNavExpanded={isSideNavExpanded}
                      onHeaderMenuButtonClick={() => {
                        setIsSideNavExpanded(
                          prevIsSideNavExpanded => !prevIsSideNavExpanded
                        );
                      }}
                    >
                      <HeaderBarContent logoutButton={logoutButton} />
                    </Header>
                    <SideNav expanded={isSideNavExpanded} />
                  </>
                )}
              </Route>

              <Content
                id="main-content"
                className="tkn--main-content"
                aria-labelledby="main-content-header"
                tabIndex="0"
              >
                <PageErrorBoundary>
                  <Switch>
                    <Route
                      path="/"
                      exact
                      render={() => <Redirect to={urls.about()} />}
                    />
                    <Route
                      path={paths.pipelines.all()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <Pipelines />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.pipelines.byNamespace()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <Pipelines />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.pipelineRuns.create()}
                      exact
                      render={() => (
                        <ReadWriteRoute>
                          <CreatePipelineRun />
                        </ReadWriteRoute>
                      )}
                    />
                    <Route
                      path={paths.pipelineRuns.all()}
                      render={() => (
                        <NamespacedRoute>
                          <PipelineRuns />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.pipelineRuns.byNamespace()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <PipelineRuns />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.pipelineRuns.byPipeline()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <PipelineRuns />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.pipelineRuns.byName()}
                      render={() => (
                        <NamespacedRoute
                          allNamespacesPath={paths.pipelineRuns.all()}
                        >
                          <PipelineRun />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.pipelineResources.all()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <PipelineResources />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.pipelineResources.byNamespace()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <PipelineResources />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.pipelineResources.byName()}
                      exact
                      render={() => (
                        <NamespacedRoute
                          allNamespacesPath={paths.pipelineResources.all()}
                        >
                          <PipelineResource />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.pipelineResources.create()}
                      exact
                      render={() => (
                        <ReadWriteRoute>
                          <CreatePipelineResource />
                        </ReadWriteRoute>
                      )}
                    />

                    <Route
                      path={paths.tasks.all()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <Tasks />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.tasks.byNamespace()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <Tasks />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.taskRuns.create()}
                      exact
                      render={() => (
                        <ReadWriteRoute>
                          <CreateTaskRun />
                        </ReadWriteRoute>
                      )}
                    />
                    <Route
                      path={paths.taskRuns.all()}
                      render={() => (
                        <NamespacedRoute>
                          <TaskRuns />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.taskRuns.byNamespace()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <TaskRuns />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.taskRuns.byTask()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <TaskRuns />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.taskRuns.byName()}
                      exact
                      render={() => (
                        <NamespacedRoute
                          allNamespacesPath={paths.taskRuns.all()}
                        >
                          <TaskRun />
                        </NamespacedRoute>
                      )}
                    />

                    <Route
                      path={paths.runs.all()}
                      render={() => (
                        <NamespacedRoute>
                          <Runs />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.runs.byNamespace()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <Runs />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.runs.byName()}
                      exact
                      render={() => (
                        <NamespacedRoute allNamespacesPath={paths.runs.all()}>
                          <Run />
                        </NamespacedRoute>
                      )}
                    />

                    <Route path={paths.clusterTasks.all()} exact>
                      <ClusterTasks />
                    </Route>

                    <Route path={paths.about()}>
                      <About />
                    </Route>
                    <Route path={paths.settings()}>
                      <Settings />
                    </Route>

                    <Route
                      path={paths.importResources()}
                      render={() => (
                        <ReadWriteRoute>
                          <ImportResources />
                        </ReadWriteRoute>
                      )}
                    />

                    <Route
                      path={paths.eventListeners.all()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <EventListeners />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.eventListeners.byNamespace()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <EventListeners />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.eventListeners.byName()}
                      exact
                      render={() => (
                        <NamespacedRoute
                          allNamespacesPath={paths.eventListeners.all()}
                        >
                          <EventListener />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.triggers.byName()}
                      exact
                      render={() => (
                        <NamespacedRoute
                          allNamespacesPath={paths.triggers.all()}
                        >
                          <Trigger />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.triggers.all()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <Triggers />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.triggers.byNamespace()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <Triggers />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.triggerBindings.byName()}
                      exact
                      render={() => (
                        <NamespacedRoute
                          allNamespacesPath={paths.triggerBindings.all()}
                        >
                          <TriggerBinding />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.triggerBindings.all()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <TriggerBindings />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.triggerBindings.byNamespace()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <TriggerBindings />
                        </NamespacedRoute>
                      )}
                    />
                    <Route path={paths.clusterTriggerBindings.byName()} exact>
                      <ClusterTriggerBinding />
                    </Route>
                    <Route path={paths.clusterTriggerBindings.all()} exact>
                      <ClusterTriggerBindings />
                    </Route>
                    <Route
                      path={paths.triggerTemplates.byName()}
                      exact
                      render={() => (
                        <NamespacedRoute
                          allNamespacesPath={paths.triggerTemplates.all()}
                        >
                          <TriggerTemplate />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.triggerTemplates.all()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <TriggerTemplates />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.triggerTemplates.byNamespace()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <TriggerTemplates />
                        </NamespacedRoute>
                      )}
                    />
                    <Route path={paths.clusterInterceptors.all()} exact>
                      <ClusterInterceptors />
                    </Route>
                    <Route path={paths.extensions.all()} exact>
                      <Extensions />
                    </Route>
                    {extensions
                      .filter(extension => !extension.type)
                      .map(({ displayName, name, source }) => (
                        <Route
                          key={name}
                          path={paths.extensions.byName({ name })}
                        >
                          <Extension
                            displayName={displayName}
                            source={source}
                          />
                        </Route>
                      ))}

                    <Route
                      path={paths.rawCRD.byNamespace()}
                      exact
                      render={() => (
                        <NamespacedRoute allNamespacesPath={paths.rawCRD.all()}>
                          <CustomResourceDefinition />
                        </NamespacedRoute>
                      )}
                    />
                    <Route path={paths.rawCRD.cluster()} exact>
                      <CustomResourceDefinition />
                    </Route>
                    <Route
                      path={paths.kubernetesResources.all()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <ResourceList />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.kubernetesResources.byNamespace()}
                      exact
                      render={() => (
                        <NamespacedRoute>
                          <ResourceList />
                        </NamespacedRoute>
                      )}
                    />
                    <Route
                      path={paths.kubernetesResources.byName()}
                      exact
                      render={() => (
                        <NamespacedRoute
                          allNamespacesPath={paths.kubernetesResources.all()}
                        >
                          <CustomResourceDefinition />
                        </NamespacedRoute>
                      )}
                    />
                    <Route path={paths.kubernetesResources.cluster()} exact>
                      <CustomResourceDefinition />
                    </Route>

                    <NotFound />
                  </Switch>
                </PageErrorBoundary>
              </Content>
            </>
          </Router>
        )}
      </IntlProvider>
    </NamespaceContext.Provider>
  );
}

export default hot(App);
