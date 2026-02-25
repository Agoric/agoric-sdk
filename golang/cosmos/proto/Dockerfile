ARG SOURCE_IMAGE
FROM ${SOURCE_IMAGE}

ARG NEW_UID
RUN id -u > old_uid
USER root

# Change file ownership from old UID to NEW_UID
RUN find / -path /proc -prune -o -user $(cat old_uid) -print0 | \
  xargs -0 -n256 chown ${NEW_UID}

# Modify /etc/passwd to set the user ID to NEW_UID
RUN sed -i -e "s/\\(^[^:]*:[^:]*:\\)$(cat old_uid)/\\1${NEW_UID}/" /etc/passwd
USER ${NEW_UID}
