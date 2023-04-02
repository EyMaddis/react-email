import logSymbols from 'log-symbols';
import { DEFAULT_EMAILS_DIRECTORY, PACKAGE_EMAILS_PATH, PACKAGE_PUBLIC_PATH } from './constants';
import fs from 'fs';
import ora from 'ora';
import shell from 'shelljs';
import path from 'path';
import fse from 'fs-extra';
import glob from 'glob';

export const generateEmailsPreview = async (emailDir: string) => {
  try {
    const spinner = ora('Generating emails preview').start();

    await createEmailPreviews(emailDir);
    await createStaticFiles(emailDir);

    spinner.stopAndPersist({
      symbol: logSymbols.success,
      text: 'Emails preview generated',
    });
  } catch (error) {
    console.log({ error });
  }
};

const createEmailPreviews = async (emailDir: string) => {
  const hasEmailsDirectory = fs.existsSync(PACKAGE_EMAILS_PATH);

  if (hasEmailsDirectory) {
    await fs.promises.rm(PACKAGE_EMAILS_PATH, { recursive: true });
  }

  const list = glob.sync(path.join(emailDir, '**/*.{jsx,tsx}'), {
    absolute: true,
  })

  /**
   * instead of copying all files, which would break and js/ts imports,
   * we create placeholder files which just contain the following code:
   * 
   * import Mail from '../../path/to/emails/my-template.tsx`
   * export default Mail 
  */
  for(const absoluteSrcFilePath of list) {
    const fileName = absoluteSrcFilePath.split('/').pop()!
    const targetFile = path.join(PACKAGE_EMAILS_PATH, absoluteSrcFilePath.replace(emailDir, ''))
    const importPath = path.relative(path.dirname(targetFile),path.dirname(absoluteSrcFilePath))
    
    let importFile = path.join(importPath, fileName)
    importFile = importFile.replace(path.extname(importFile), '')

    const sourceCode = `import Mail from '${importFile}';export default Mail;`.replace(';', ';\n')
    await fse.ensureDir(path.dirname(targetFile))
    await fse.writeFile(targetFile, sourceCode)
  }
};

const createStaticFiles = async (emailDir: string) => {
  const hasPublicDirectory = fs.existsSync(PACKAGE_PUBLIC_PATH);

  if (hasPublicDirectory) {
    await fs.promises.rm(PACKAGE_PUBLIC_PATH, { recursive: true });
  }

  await fse.ensureDir(path.join(PACKAGE_PUBLIC_PATH, 'static'));

  const result = shell.cp(
    '-r',
    path.join(emailDir, 'static'),
    path.join(PACKAGE_PUBLIC_PATH),
  );
  if (result.code > 0) {
    throw new Error(
      `Something went wrong while copying the file to ${path.join(
        emailDir,
        'static',
      )}, ${result.cat()}`,
    );
  }
};
